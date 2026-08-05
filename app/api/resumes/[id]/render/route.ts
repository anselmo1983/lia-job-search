import { NextResponse } from "next/server"
import { ResumeDocumentSchema } from "@/lib/db/resume-schema"
import { getCompiledResume } from "@/lib/db/resume-repository"
import { renderResumeDocument } from "@/lib/services/resume-renderer"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { format = "html", draftDoc } = body

    let targetDoc = undefined

    if (draftDoc) {
      targetDoc = ResumeDocumentSchema.parse(draftDoc)
    } else {
      targetDoc = getCompiledResume(id)
    }

    if (!targetDoc) {
      return NextResponse.json({ error: "Currículo não encontrado" }, { status: 404 })
    }

    const rendered = renderResumeDocument(targetDoc, format === "latex" ? "latex" : "html")

    return NextResponse.json({
      format: rendered.format,
      mimeType: rendered.mimeType,
      content: rendered.content,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao renderizar currículo", details: error?.message },
      { status: 500 }
    )
  }
}
