import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCompiledResume } from "@/lib/db/resume-repository"
import { calculateResumeDocumentAtsMatch } from "@/lib/services/tailoring-engine"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { jobDescription, jobId } = body

    const resumeDoc = getCompiledResume(id)
    if (!resumeDoc) {
      return NextResponse.json({ error: "Currículo não encontrado" }, { status: 404 })
    }

    let targetDescription = jobDescription || ""

    if (!targetDescription && jobId) {
      const db = getDb()
      const jobRow = db
        .prepare("SELECT description FROM jobs WHERE id = ?")
        .get(jobId) as { description: string } | undefined
      if (jobRow) {
        targetDescription = jobRow.description
      }
    }

    if (!targetDescription) {
      return NextResponse.json(
        { error: "Descrição da vaga (jobDescription ou jobId) é obrigatória" },
        { status: 400 }
      )
    }

    const atsReport = calculateResumeDocumentAtsMatch(resumeDoc, targetDescription)

    return NextResponse.json({
      success: true,
      resumeId: id,
      atsReport,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao calcular relatório ATS do currículo", details: error?.message },
      { status: 500 }
    )
  }
}
