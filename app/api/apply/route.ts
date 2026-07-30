import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { job, apiKey, provider, profile } = await request.json()
    if (!apiKey) return NextResponse.json({ error: "API key necessária" }, { status: 400 })
    
    const result: any = {}
    
    // Step 1: Avaliar fit
    if (provider === "openai") {
      const OpenAI = (await import("openai")).default
      const openai = new OpenAI({ apiKey })
      
      const evaluation = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Avalie o fit entre o perfil e a vaga. Retorne JSON: {fitScore:0-100, verdict, strengths:[string], gaps:[string], recommendation}" },
          { role: "user", content: `Perfil: ${(profile || "").substring(0, 2000)}\n\nVaga: ${JSON.stringify(job)}` }
        ],
        response_format: { type: "json_object" }
      })
      result.evaluation = JSON.parse(evaluation.choices[0].message.content || "{}")
      
      // Step 2: Gerar CV adaptado (texto)
      const cv = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Gere um currículo adaptado para esta vaga em Markdown. Inclua: resumo profissional, experiência, habilidades, educação. Destaque as competências mais relevantes para a vaga." },
          { role: "user", content: `Perfil: ${(profile || "").substring(0, 2000)}\n\nVaga: ${job.title} na ${job.company}\n\nDescrição: ${job.description || ""}` }
        ]
      })
      result.cv = cv.choices[0].message.content
      
      // Step 3: Gerar carta de apresentação
      const letter = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Gere uma carta de apresentação profissional em Markdown. Formal, personalizada para a vaga, destacando motivação e fit." },
          { role: "user", content: `Vaga: ${job.title} na ${job.company}\n\nDescrição: ${job.description || ""}\n\nPerfil do candidato: ${(profile || "").substring(0, 1000)}` }
        ]
      })
      result.coverLetter = letter.choices[0].message.content
      
      // Step 4: Revisão por segundo agente
      const review = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Revise o currículo e carta gerados. Retorne JSON: {issues:[{severity, item, suggestion}], atsScore:0-100, improvements:[string]}" },
          { role: "user", content: `Currículo:\n${result.cv}\n\nCarta:\n${result.coverLetter}\n\nVaga: ${job.title} na ${job.company}` }
        ],
        response_format: { type: "json_object" }
      })
      result.review = JSON.parse(review.choices[0].message.content || "{}")
      
      // Step 5: Versão final revisada
      const final = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Incorpore as revisões e gere a versão final do currículo em Markdown." },
          { role: "assistant", content: `Currículo original:\n${result.cv}` },
          { role: "assistant", content: `Revisões: ${JSON.stringify(result.review.issues || [])}` }
        ]
      })
      result.finalCv = final.choices[0].message.content
    }
    
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
