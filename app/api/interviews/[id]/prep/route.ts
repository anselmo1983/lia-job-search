import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getProfileSync } from "@/lib/db/profile-sync"
import {
  generateInterviewPrepGuide,
  getInterview,
  updateInterview,
} from "@/lib/services/interview-service"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const interview = getInterview(id)
    if (!interview) {
      return NextResponse.json({ error: "Entrevista não encontrada" }, { status: 404 })
    }

    const profile = getProfileSync()
    if (!profile) {
      return NextResponse.json(
        { error: "Perfil do candidato não encontrado para gerar o guia" },
        { status: 400 }
      )
    }

    let jobDescription = ""
    if (interview.jobId) {
      const db = getDb()
      const jobRow = db
        .prepare("SELECT description FROM jobs WHERE id = ?")
        .get(interview.jobId) as { description: string } | undefined
      if (jobRow) jobDescription = jobRow.description
    }

    const prepGuide = generateInterviewPrepGuide(
      { title: interview.role, company: interview.company, description: jobDescription },
      profile
    )

    const updated = updateInterview(id, { prepGuide })

    return NextResponse.json({
      success: true,
      prepGuide,
      interview: updated,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao gerar Guia de Preparação IA", details: error?.message },
      { status: 500 }
    )
  }
}
