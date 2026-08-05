import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE_NAME } from "@/lib/auth/config"

/**
 * CT224 — Middleware de proteção (cookie-gate otimista).
 *
 * Este middleware é uma barreira OTIMISTA: apenas verifica a existência do
 * cookie de sessão e redireciona para /login quando ausente. A validação real
 * da sessão acontece server-side (getServerSession nas páginas protegidas e
 * requireSession nas rotas de API), porque a sessão vive em SQLite e exige o
 * runtime Node.
 *
 * `/api/auth/*` (endpoints do Better Auth) e `/api/health` (liveness probe do
 * deploy) permanecem públicos.
 */
export function middleware(request: NextRequest) {
  const hasSessionCookie =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ||
    request.cookies.get(`__Secure-${SESSION_COOKIE_NAME}`)?.value ||
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value

  if (!hasSessionCookie) {
    const url = new URL("/login", request.url)
    if (request.nextUrl.pathname !== "/login") {
      url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search)
    }
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Seções da aplicação
    "/",
    "/fill-ups/:path*",
    "/jobs/:path*",
    "/batch/:path*",
    "/applications/:path*",
    "/network/:path*",
    "/tasks/:path*",
    "/resumes/:path*",
    "/statistics/:path*",
    "/calendar/:path*",
    "/documents/:path*",
    "/workflows/:path*",
    "/settings/:path*",
    // APIs operacionais (auth e health excluídas via negative lookahead)
    "/api/((?!auth|health).*)",
  ],
}
