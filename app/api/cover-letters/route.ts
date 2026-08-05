import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth/server"
import { getProfileSync } from "@/lib/db/profile-sync"
import { compileCoverLetterDocument } from "@/lib/services/cover-letter-compiler"
import { renderCoverLetterToHtml, renderCoverLetterToLatex } from "@/lib/services/resume-renderer"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    const profile = getProfileSync()

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil do candidato não encontrado. Preencha o perfil antes de compilar a carta." },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { title, company, description, jobId } = body

    if (!title || !company) {
      return NextResponse.json(
        { error: "Título (title) e Empresa (company) da vaga são obrigatórios" },
        { status: 400 }
      )
    }

    const compiledLetter = compileCoverLetterDocument(profile, {
      id: jobId,
      title,
      company,
      description,
    })

    const latexCode = renderCoverLetterToLatex(compiledLetter)
    const htmlPreview = renderCoverLetterToHtml(compiledLetter)

    return NextResponse.json({
      success: true,
      coverLetter: compiledLetter,
      renderings: {
        latex: latexCode,
        html: htmlPreview,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao compilar carta de apresentação", details: error?.message },
      { status: 500 }
    )
  }
}
