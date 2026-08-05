import { toNextJsHandler } from "better-auth/next-js"

import { auth } from "@/lib/auth/server"

// CT224 — Rota catch-all do Better Auth (app/api/auth/[...all]).
// `runtime = "nodejs"` é obrigatório: o adapter SQLite (better-sqlite3) e a
// validação de sessão exigem o runtime Node (não roda em Edge).
export const runtime = "nodejs"

export const { GET, POST } = toNextJsHandler(auth)
