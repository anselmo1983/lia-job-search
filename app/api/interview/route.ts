import { NextResponse } from "next/server"
import { completeJson, getDefaultModel } from "@/lib/inference/bifrost"

// CT223 — preparação para entrevista. Arquitetura: UI → CT223 → lib/inference/bifrost.ts → CT109.
// Nenhum provider direto; nenhuma chave vinda do cliente.

export async function POST(request: Request) {
  try {
    const { job, cv } = await request.json()
    if (!job?.title) return NextResponse.json({ error: "Vaga inválida" }, { status: 400 })

    const result = await completeJson({
      model: getDefaultModel(),
      system:
        "Prepare o candidato para entrevista. Retorne JSON: {questions:[{question, context, suggestedAnswer}], talkingPoints:[string], companyResearch:[string], salaryExpectations:string}",
      messages: [
        {
          role: "user",
          content: `Vaga: ${job.title} na ${job.company}\n\nDescrição: ${job.description || ""}\n\nCurrículo do candidato:\n${cv || ""}`,
        },
      ],
      maxTokens: 2500,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao preparar entrevista"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
