import { NextResponse } from "next/server"
import { getStatus } from "@/lib/inference/bifrost"

// GET /api/inference/status — estado somente leitura do Bifrost (CT109).
// Retorna APENAS dados não secretos. Nunca retorna BIFROST_VIRTUAL_KEY,
// headers de autenticação ou chaves de provider.
export async function GET() {
  try {
    const status = await getStatus()
    return NextResponse.json({
      connected: status.connected,
      authority: status.authority,
      credentialMode: status.credentialMode,
      defaultModel: status.defaultModel,
      reviewModel: status.reviewModel,
    })
  } catch {
    return NextResponse.json({
      connected: false,
      authority: "CT109 Bifrost",
      credentialMode: "server-side",
      defaultModel: "—",
      reviewModel: "—",
    })
  }
}
