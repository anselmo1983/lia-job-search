import { NextResponse } from "next/server"
import {
  deleteInterview,
  getInterview,
  updateInterview,
} from "@/lib/services/interview-service"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const interview = getInterview(id)
    if (!interview) {
      return NextResponse.json({ error: "Entrevista não encontrada" }, { status: 404 })
    }
    return NextResponse.json({ interview })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao buscar entrevista", details: error?.message },
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
    const body = await request.json().catch(() => ({}))

    const updated = updateInterview(id, body)
    if (!updated) {
      return NextResponse.json({ error: "Entrevista não encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true, interview: updated })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao atualizar entrevista", details: error?.message },
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
    const success = deleteInterview(id)
    if (!success) {
      return NextResponse.json({ error: "Entrevista não encontrada" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao excluir entrevista", details: error?.message },
      { status: 500 }
    )
  }
}
