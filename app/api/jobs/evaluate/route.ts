import { NextResponse } from "next/server"
import { batchEvaluateJobs } from "@/lib/services/matching-engine"
import { getProfileSync } from "@/lib/db/profile-sync"
import { requireSession } from "@/lib/auth/server"

export async function POST(req: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const profile = getProfileSync()
    if (!profile) {
      return NextResponse.json({ error: "Perfil do candidato não encontrado" }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const jobIds = Array.isArray(body.jobIds) ? body.jobIds : undefined

    const { evaluatedCount, results } = batchEvaluateJobs(jobIds, profile)

    return NextResponse.json({
      success: true,
      evaluatedCount,
      results: results.map((r) => ({
        jobId: r.jobId,
        score: r.fitResult.score,
        fit: r.fitResult.fit,
        recommendation: r.fitResult.recommendation,
        strengths: r.fitResult.strengths,
        gaps: r.fitResult.gaps,
        dealbreakersTriggered: r.fitResult.dealbreakersTriggered,
        subScores: r.fitResult.subScores,
      })),
    })
  } catch (error: any) {
    console.error("Erro na avaliação multidimensional de vagas:", error)
    return NextResponse.json({ error: "Falha ao avaliar vagas em lote", details: error?.message }, { status: 500 })
  }
}
