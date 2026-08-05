// CT224 — config compartilhada de autenticação (Better Auth).
//
// Deriva o baseURL de BETTER_AUTH_URL, com fallback para desenvolvimento.
// Mantém um único ponto de verdade para o nome/prefixo dos cookies de sessão,
// usado pelo middleware (cookie-gate otimista) e pelo cliente.

export const AUTH_BASE_PATH = "/api/auth"

/** Cookie de sessão do Better Auth (padrão). Espelhado no middleware. */
export const SESSION_COOKIE_NAME = "better-auth.session_token"

/** Pré-fixo de cookie do Better Auth (padrão: "better-auth"). */
export const COOKIE_PREFIX = "better-auth"

export function getAuthBaseURL(): string {
  const fromEnv =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    (process.env.VERCEL_URL?.trim() ? `https://${process.env.VERCEL_URL.trim()}` : "")

  if (fromEnv) return fromEnv.replace(/\/+$/, "")
  return "http://localhost:3000"
}

/** Check whether Google OAuth credentials are configured in the environment. */
export function hasGoogleOAuthCredentials(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  )
}
