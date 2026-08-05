import { NextResponse } from "next/server"
import { getJobTransitionHistory, transitionJobStatus } from "@/lib/services/job-transition-service"

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: "ID da vaga é obrigatório." }, { status: 400 })
    }

    const history = getJobTransitionHistory(id)
    return NextResponse.json({ history })
  } catch (err: any) {
    console.error("Erro ao buscar histórico da vaga:", err)
    return NextResponse.json({ error: err.message || "Erro ao carregar histórico." }, { status: 500 })
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await req.json()
    const { toStatus, actor, notes } = body

    if (!toStatus) {
      return NextResponse.json({ error: "toStatus é obrigatório." }, { status: 400 })
    }

    const res = transitionJobStatus(id, toStatus, actor || "user", notes)
    return NextResponse.json({ success: true, transition: res })
  } catch (err: any) {
    console.error("Erro ao atualizar transição da vaga:", err)
    return NextResponse.json({ error: err.message || "Erro ao processar transição." }, { status: 500 })
  }
}
