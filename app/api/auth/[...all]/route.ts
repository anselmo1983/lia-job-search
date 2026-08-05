import { toNextJsHandler } from "better-auth/next-js"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth/server"
import { logger } from "@/lib/logging"

// CT224 — Rota catch-all do Better Auth (app/api/auth/[...all]).
// `runtime = "nodejs"` é obrigatório: o adapter SQLite (better-sqlite3) e a
// validação de sessão exigem o runtime Node (não roda em Edge).
export const runtime = "nodejs"

const handlers = toNextJsHandler(auth)

export async function GET(request: Request) {
  try {
    return await handlers.GET(request)
  } catch (err: unknown) {
    logger.error("Falha no endpoint GET de autenticação", err, "api/auth/[...all]")
    return NextResponse.json(
      {
        error: "Serviço de autenticação indisponível. Verifique se GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET estão configurados no ambiente.",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    return await handlers.POST(request)
  } catch (err: unknown) {
    logger.error("Falha no endpoint POST de autenticação", err, "api/auth/[...all]")
    return NextResponse.json(
      {
        error: "Serviço de autenticação indisponível. Verifique se GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET estão configurados no ambiente.",
      },
      { status: 500 },
    )
  }
}
