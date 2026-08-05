import "server-only"
import Database from "better-sqlite3"
import { betterAuth } from "better-auth"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { dataPath } from "@/lib/runtime/data-directory"
import { COOKIE_PREFIX, getAuthBaseURL } from "@/lib/auth/config"

/**
 * CT224 — Autenticação (Better Auth) — autoridade de sessão server-side.
 *
 * - Providers externos: GitHub + Google (single-user/pessoal, OAuth = identidade confiável).
 * - Estado de sessão: SQLite (better-sqlite3) em <LIA_DATA_DIR>/auth/auth.db — mount
 *   persistente do host, então sessões sobrevivem a restart do container.
 * - Credenciais de OAuth apenas neste módulo (server-only); nunca vão ao browser.
 * - Não toca no contrato Bifrost (BIFROST_*) — ver lib/inference/bifrost.ts.
 */

// --- bootstrap idempotente do schema SQLite (first-boot em produção) --------
// O schema canônico é criado por `npx @better-auth/cli migrate`; este guard
// garante que o primeiro boot sem banco pré-criado ainda funcione.
const AUTH_DB_PATH = dataPath("auth", "auth.db")

function bootstrapAuthSchema(dbPath: string): void {
  try {
    const db = new Database(dbPath)
    db.pragma("journal_mode = WAL")
    db.exec(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        emailVerified INTEGER NOT NULL DEFAULT 0,
        image TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY NOT NULL,
        expiresAt INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        ipAddress TEXT,
        userAgent TEXT,
        userId TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY NOT NULL,
        accountId TEXT NOT NULL,
        providerId TEXT NOT NULL,
        userId TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
        accessToken TEXT,
        refreshToken TEXT,
        idToken TEXT,
        accessTokenExpiresAt INTEGER,
        refreshTokenExpiresAt INTEGER,
        scope TEXT,
        password TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY NOT NULL,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expiresAt INTEGER NOT NULL,
        createdAt INTEGER,
        updatedAt INTEGER
      );
    `)
    db.close()
  } catch {
    // Best-effort: se o diretório ainda não existe, o Better Auth cria a base
    // na primeira gravação. Falha silenciosa para não derrubar o boot.
  }
}

bootstrapAuthSchema(AUTH_DB_PATH)

// Allowlist opcional de identidade: se AUTH_ALLOWED_EMAIL estiver setado, apenas
// os e-mails listados (lowercase) conseguem entrar — gate de single-user.
const allowedEmails = (process.env.AUTH_ALLOWED_EMAIL || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

function isEmailAllowed(email?: string | null): boolean {
  if (allowedEmails.length === 0) return true
  if (!email) return false
  return allowedEmails.includes(email.trim().toLowerCase())
}

export const auth = betterAuth({
  baseURL: getAuthBaseURL(),
  secret: process.env.AUTH_SECRET,
  database: new Database(AUTH_DB_PATH),
  // Sessão de 30 dias com renovação deslizante (após 1 dia).
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  user: {
    additionalFields: {},
  },
  cookiePrefix: COOKIE_PREFIX,
  trustedOrigins: [getAuthBaseURL()],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isEmailAllowed(user.email)) {
            return false
          }
        },
      },
    },
  },
})

/** Sessão do usuário atual (páginas server e rotas de API). */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() })
}

/**
 * Guard para rotas de API: retorna uma Response 401 se não autenticado,
 * ou null se autenticado. Use:
 *   const unauthorized = await requireSession(); if (unauthorized) return unauthorized
 */
export async function requireSession(): Promise<NextResponse | null> {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  return null
}
