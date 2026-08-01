import { NextResponse } from "next/server"
import { completeJson, completeText, getDefaultModel, getReviewModel } from "@/lib/inference/bifrost"

// Arquitetura: UI → CT223 → lib/inference/bifrost.ts → CT109.
// As credenciais ficam no servidor; nada de apiKey/provider/model vindo do cliente.

export async function POST(request: Request) {
  try {
    const { job, profile } = await request.json()
    if (!job?.title) return NextResponse.json({ error: "Vaga inválida" }, { status: 400 })

    const defaultModel = getDefaultModel()
    const reviewModel = getReviewModel()
    const profileText = (profile || "").substring(0, 2000)
    const jobText = `${job.title} na ${job.company || "empresa"}${job.description ? `\n\nDescrição: ${job.description}` : ""}`

    const result: any = {}

    // Step 1: Avaliar fit (modelo padrão)
    result.evaluation = await completeJson({
      model: defaultModel,
      system: "Avalie o fit entre o perfil e a vaga. Retorne JSON: {fitScore:0-100, verdict, strengths:[string], gaps:[string], recommendation}",
      messages: [{ role: "user", content: `Perfil: ${profileText}\n\nVaga: ${jobText}` }],
      maxTokens: 2000,
    })

    // Step 2: Gerar CV adaptado (modelo padrão)
    result.cv = await completeText({
      model: defaultModel,
      system: "Gere um currículo adaptado para esta vaga em Markdown. Inclua: resumo profissional, experiência, habilidades, educação.",
      messages: [{ role: "user", content: `Perfil: ${profileText}\n\nVaga: ${job.title} na ${job.company}\n\nDescrição: ${job.description || ""}` }],
      maxTokens: 4000,
    })

    // Step 3: Gerar carta de apresentação (modelo padrão)
    result.coverLetter = await completeText({
      model: defaultModel,
      system: "Gere uma carta de apresentação profissional em Markdown. Formal, personalizada para a vaga.",
      messages: [{ role: "user", content: `Vaga: ${job.title} na ${job.company}\n\nDescrição: ${job.description || ""}\n\nPerfil: ${profileText.substring(0, 1000)}` }],
      maxTokens: 4000,
    })

    // Step 4: Revisão por segundo agente (modelo de revisão)
    result.review = await completeJson({
      model: reviewModel,
      system: "Revise o currículo e carta gerados. Retorne JSON: {issues:[{severity, item, suggestion}], atsScore:0-100, improvements:[string]}",
      messages: [{ role: "user", content: `Currículo:\n${result.cv}\n\nCarta:\n${result.coverLetter}\n\nVaga: ${job.title} na ${job.company}` }],
      maxTokens: 2000,
    })

    // Step 5: Versão final revisada (modelo de revisão)
    result.finalCv = await completeText({
      model: reviewModel,
      system: "Incorpore as revisões e gere a versão final do currículo em Markdown.",
      messages: [
        { role: "assistant", content: `Currículo original:\n${result.cv}` },
        { role: "assistant", content: `Revisões: ${JSON.stringify((result.review as any)?.issues || [])}` },
      ],
      maxTokens: 4000,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar documentos"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
