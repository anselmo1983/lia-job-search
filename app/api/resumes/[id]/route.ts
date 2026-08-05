import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth/server"
import { JsonPatchOperationSchema } from "@/lib/db/resume-schema"
import {
  deleteCompiledResume,
  getCompiledResume,
  updateCompiledResumeWithPatch,
} from "@/lib/db/resume-repository"
import { applyJsonPatch, generatePatchSummary } from "@/lib/services/resume-patch"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const resume = getCompiledResume(id)
    if (!resume) {
      return NextResponse.json({ error: "Currículo não encontrado" }, { status: 404 })
    }
    return NextResponse.json({ resume })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao buscar currículo", details: error?.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession()
    const currentDoc = getCompiledResume(id)

    if (!currentDoc) {
      return NextResponse.json({ error: "Currículo não encontrado" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const { patches, author = "user", changeSummary } = body

    if (!Array.isArray(patches) || patches.length === 0) {
      return NextResponse.json(
        { error: "Array de operações 'patches' é obrigatório" },
        { status: 400 }
      )
    }

    // Validar formato dos patches
    const validPatches = patches.map((p) => JsonPatchOperationSchema.parse(p))

    // Aplicar patch
    const { patchedDocument } = applyJsonPatch(currentDoc, validPatches)
    const summary = changeSummary || generatePatchSummary(validPatches)

    // Persistir nova versão e snapshot
    const version = updateCompiledResumeWithPatch(
      id,
      validPatches,
      patchedDocument,
      session?.user?.email || author,
      summary
    )

    return NextResponse.json({
      success: true,
      resume: patchedDocument,
      version,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao aplicar patch no currículo", details: error?.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const success = deleteCompiledResume(id)
    if (!success) {
      return NextResponse.json({ error: "Currículo não encontrado" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao deletar currículo", details: error?.message },
      { status: 500 }
    )
  }
}
