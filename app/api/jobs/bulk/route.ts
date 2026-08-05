import { NextResponse } from "next/server"
import { transitionJobsInBulk } from "@/lib/services/job-transition-service"
import { getDb } from "@/lib/db"
import { evaluateAndSaveJobFit } from "@/lib/services/matching-engine"
import { getProfileSync } from "@/lib/db/profile-sync"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, jobIds, targetStatus, notes } = body

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({ error: "Lista de jobIds é obrigatória e deve ser não-vazia." }, { status: 400 })
    }

    if (action === "update_status") {
      if (!targetStatus) {
        return NextResponse.json({ error: "targetStatus é obrigatório para action update_status." }, { status: 400 })
      }

      const result = transitionJobsInBulk(jobIds, targetStatus, "user", notes || "Atualização via ação em lote")
      return NextResponse.json({
        success: true,
        action,
        updatedCount: result.updatedCount,
      })
    }

    if (action === "rescore") {
      const profile = getProfileSync()
      if (!profile) {
        return NextResponse.json({ error: "Perfil do candidato não encontrado para recálculo de fit." }, { status: 404 })
      }

      let rescoredCount = 0
      for (const id of jobIds) {
        const fit = evaluateAndSaveJobFit(id, profile)
        if (fit) rescoredCount++
      }

      return NextResponse.json({
        success: true,
        action,
        rescoredCount,
      })
    }

    if (action === "archive") {
      const result = transitionJobsInBulk(jobIds, "archived", "user", "Arquivamento em lote")
      return NextResponse.json({
        success: true,
        action,
        archivedCount: result.updatedCount,
      })
    }

    return NextResponse.json({ error: `Ação '${action}' não suportada.` }, { status: 400 })
  } catch (err: any) {
    console.error("Erro na API /api/jobs/bulk:", err)
    return NextResponse.json({ error: err.message || "Erro interno no servidor." }, { status: 500 })
  }
}
