import { toNextJsHandler } from "better-auth/next-js"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth/server"
import { logger } from "@/lib/logging"

// CT224 — Rota catch-all do Better Auth (app/api/auth/[...all]).
// `runtime = "nodejs"` é obrigatório: o adapter SQLite (better-sqlite3) e a
// validação de sessão exigem o runtime Node (não roda em Edge).
export const runtime = "nodejs"

// Threshold de taxa de requisições (rate limiting) em memória por IP
const ipMap = new Map<string, number[]>()

function checkRateLimit(ip: string, maxRequests: number, windowMs = 60_000): boolean {
  const now = Date.now()
  const timestamps = (ipMap.get(ip) || []).filter((t) => now - t < windowMs)

  if (timestamps.length >= maxRequests) {
    return false // Limite excedido
  }

  timestamps.push(now)
  ipMap.set(ip, timestamps)
  return true // Permitido
}

function extractClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "127.0.0.1"
  )
}

const handlers = toNextJsHandler(auth)

export async function GET(request: Request) {
  const clientIp = extractClientIp(request)
  if (!checkRateLimit(clientIp, 60)) {
    logger.warn(`Threshold de requisições GET/auth excedido para IP ${clientIp}`, "api/auth/rate-limit")
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde 60 segundos antes de tentar novamente." },
      { status: 429, headers: { "Retry-After": "60" } },
    )
  }

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
  const clientIp = extractClientIp(request)
  // Limite estrito de 10 tentativas por minuto por IP para login/POST
  if (!checkRateLimit(clientIp, 10)) {
    logger.warn(`Threshold de tentativas de login (POST/auth) excedido para IP ${clientIp}`, "api/auth/rate-limit")
    return NextResponse.json(
      { error: "Muitas tentativas de acesso. Aguarde 60 segundos antes de tentar novamente." },
      { status: 429, headers: { "Retry-After": "60" } },
    )
  }

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
