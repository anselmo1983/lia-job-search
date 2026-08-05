import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth/server"
import { listResumeVersions, rollbackResumeToVersion } from "@/lib/db/resume-repository"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const versions = listResumeVersions(id)
    return NextResponse.json({ versions })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao obter histórico de versões", details: error?.message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession()
    const body = await request.json().catch(() => ({}))
    const { targetVersionNumber } = body

    if (typeof targetVersionNumber !== "number") {
      return NextResponse.json(
        { error: "O parâmetro 'targetVersionNumber' numérico é obrigatório" },
        { status: 400 }
      )
    }

    const version = rollbackResumeToVersion(
      id,
      targetVersionNumber,
      session?.user?.email || "user"
    )

    if (!version) {
      return NextResponse.json(
        { error: "Versão de destino não encontrada para reversão" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      restoredVersion: version,
      resume: version.snapshot,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao reverter versão do currículo", details: error?.message },
      { status: 500 }
    )
  }
}
