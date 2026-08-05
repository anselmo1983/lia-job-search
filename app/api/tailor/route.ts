import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { requireSession } from "@/lib/auth/server"
import { getProfileSync } from "@/lib/db/profile-sync"
import { generateTailoredDocument } from "@/lib/services/tailoring-engine"

export async function POST(req: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const profile = getProfileSync()
    if (!profile) {
      return NextResponse.json({ error: "Perfil do candidato não encontrado" }, { status: 404 })
    }

    const body = await req.json()
    const { jobId, docType = "cv", format = "latex" } = body

    if (!jobId) {
      return NextResponse.json({ error: "O parâmetro jobId é obrigatório." }, { status: 400 })
    }

    const db = getDb()
    const jobRow = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as any

    if (!jobRow) {
      return NextResponse.json({ error: `Vaga com id ${jobId} não encontrada.` }, { status: 404 })
    }

    const tailored = generateTailoredDocument(
      {
        title: jobRow.title,
        company: jobRow.company,
        description: jobRow.description || "",
      },
      profile,
      docType,
      format
    )

    return NextResponse.json({
      success: true,
      jobId,
      docType: tailored.docType,
      format: tailored.format,
      atsMatch: tailored.atsMatch,
      cvContent: tailored.cvContent,
      coverLetterContent: tailored.coverLetterContent,
    })
  } catch (error: any) {
    console.error("Erro na rota /api/tailor:", error)
    return NextResponse.json(
      { error: "Falha ao gerar documentos personalizados", details: error?.message },
      { status: 500 }
    )
  }
}
