import Database from "better-sqlite3"
import { betterAuth } from "better-auth"

import { dataPath } from "@/lib/runtime/data-directory"
import { COOKIE_PREFIX, getAuthBaseURL } from "@/lib/auth/config"

/**
 * Config de autenticação usada APENAS pela CLI do Better Auth
 * (`npx @better-auth/cli migrate`), que não resolve `server-only`.
 *
 * O arquivo canônico em runtime é `lib/auth/server.ts`.
 */
const AUTH_DB_PATH = dataPath("auth", "auth.db")

export const auth = betterAuth({
  baseURL: getAuthBaseURL(),
  secret: process.env.AUTH_SECRET,
  database: new Database(AUTH_DB_PATH),
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
})

export default auth
