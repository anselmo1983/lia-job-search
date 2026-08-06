import "server-only"
import { betterAuth } from "better-auth"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { getDb } from "@/lib/db"
import { COOKIE_PREFIX, getAuthBaseURL, hasGoogleOAuthCredentials } from "@/lib/auth/config"
import { logger } from "@/lib/logging"

/**
 * CT224 — Autenticação (Better Auth) — autoridade de sessão server-side.
 *
 * - Provedores: Google OAuth + Email & Password (com signup desativado no ambiente single-user).
 * - Banco: SQLite (better-sqlite3) em <LIA_DATA_DIR>/database/lia.db.
 * - Credenciais de OAuth / Auth apenas neste módulo (server-only).
 */

const allowedEmailsRaw =
  process.env.LJS_AUTH_ALLOWED_EMAILS?.trim() || process.env.AUTH_ALLOWED_EMAIL?.trim() || ""

const allowedEmails = allowedEmailsRaw
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function isEmailAllowed(email?: string | null): boolean {
  if (allowedEmails.length === 0) return true
  if (!email) return false
  return allowedEmails.includes(email.trim().toLowerCase())
}

const canonicalURL = getAuthBaseURL()
const configuredTrustedOrigins = Array.from(
  new Set([
    canonicalURL,
    "https://ljs.afcertus.com.br",
    "https://lia-job-search.vercel.app",
    "http://ljs.home",
    "https://lia-job-search.tail050f5c.ts.net",
    "http://localhost:3000",
  ]),
).filter(Boolean)

// ── Startup validation: detect missing OAuth credentials early (fail-fast) ──
if (process.env.NODE_ENV === "production" && !hasGoogleOAuthCredentials()) {
  logger.warn(
    "Google OAuth credentials missing (GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET). " +
      "Google sign-in will fail at runtime. " +
      "Set these in Vercel Dashboard → Settings → Environment Variables and redeploy.",
    "auth/startup",
    { env: "production" },
  )
}

export const auth = betterAuth({
  baseURL: canonicalURL,
  secret:
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "lia-job-search-default-secret-change-in-production-32chars",
  database: getDb(),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias
    updateAge: 60 * 60 * 24, // Sliding update após 1 dia
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // Fase 2: Signup desativado em produção single-user
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      scope: ["openid", "profile", "email"],
    },
  },
  user: {
    additionalFields: {},
  },
  cookiePrefix: COOKIE_PREFIX,
  trustedOrigins: configuredTrustedOrigins,
  advanced: {
    trustedProxyHeaders: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user: { email: string }) => {
          if (!isEmailAllowed(user.email)) {
            return false
          }
        },
      },
    },
  },
})

/** Sessão do usuário atual (páginas server e rotas de API), validada com a allowlist server-side. */
export async function getServerSession() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return null
    if (!isEmailAllowed(session.user?.email)) return null
    return session
  } catch (error) {
    logger.warn(`Falha não fatal ao verificar sessão: ${error}`, "auth/server")
    return null
  }
}

/**
 * Guard para rotas de API: retorna 401 se não autenticado ou 403 se fora da allowlist,
 * ou null se autorizado.
 */
export async function requireSession(): Promise<NextResponse | null> {
  try {
    const rawSession = await auth.api.getSession({ headers: await headers() })
    if (!rawSession) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    if (!isEmailAllowed(rawSession.user?.email)) {
      return NextResponse.json({ error: "Acesso negado: e-mail fora da allowlist" }, { status: 403 })
    }
    return null
  } catch (error) {
    logger.warn(`Falha não fatal na validação de requireSession: ${error}`, "auth/server")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
}
