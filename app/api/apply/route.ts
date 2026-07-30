import { NextResponse } from "next/server"

async function createClient(provider: string, apiKey: string) {
  if (provider === "anthropic") {
    const Anthropic = (await import("@anthropic-ai/sdk")).default
    return { client: new Anthropic({ apiKey }), provider: "anthropic" }
  }
  if (provider === "kimi") {
    const OpenAI = (await import("openai")).default
    return { client: new OpenAI({ apiKey, baseURL: "https://api.moonshot.ai/v1" }), provider: "openai", modelPrefix: "" }
  }
  // OpenAI default
  const OpenAI = (await import("openai")).default
  return { client: new OpenAI({ apiKey }), provider: "openai" }
}

async function callJson(provider: string, client: any, model: string, messages: any[]) {
  if (provider === "anthropic") {
    const response = await client.messages.create({ model, max_tokens: 2000, messages })
    const content = response.content[0]
    const text = content.type === "text" ? content.text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  }
  // OpenAI-compatible (OpenAI, Kimi)
  const response = await client.chat.completions.create({ model, messages, response_format: { type: "json_object" } })
  return JSON.parse(response.choices[0].message.content || "{}")
}

async function callText(provider: string, client: any, model: string, messages: any[]) {
  if (provider === "anthropic") {
    const response = await client.messages.create({ model, max_tokens: 4000, messages })
    const content = response.content[0]
    return content.type === "text" ? content.text : ""
  }
  const response = await client.chat.completions.create({ model, messages })
  return response.choices[0].message.content || ""
}

export async function POST(request: Request) {
  try {
    const { job, apiKey, provider = "openai", profile, model } = await request.json()
    if (!apiKey) return NextResponse.json({ error: "API key necessária" }, { status: 400 })
    
    const result: any = {}
    const { client, provider: providerType } = await createClient(provider, apiKey)
    const m = model || (provider === "kimi" ? "kimi-k2.6" : provider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o-mini")
    
    // Step 1: Avaliar fit
    result.evaluation = await callJson(providerType, client, m, [
      { role: "system", content: "Avalie o fit entre o perfil e a vaga. Retorne JSON: {fitScore:0-100, verdict, strengths:[string], gaps:[string], recommendation}" },
      { role: "user", content: `Perfil: ${(profile || "").substring(0, 2000)}\n\nVaga: ${JSON.stringify(job)}` }
    ])
    
    // Step 2: Gerar CV adaptado
    result.cv = await callText(providerType, client, m, [
      { role: "system", content: "Gere um currículo adaptado para esta vaga em Markdown. Inclua: resumo profissional, experiência, habilidades, educação." },
      { role: "user", content: `Perfil: ${(profile || "").substring(0, 2000)}\n\nVaga: ${job.title} na ${job.company}\n\nDescrição: ${job.description || ""}` }
    ])
    
    // Step 3: Gerar carta de apresentação
    result.coverLetter = await callText(providerType, client, m, [
      { role: "system", content: "Gere uma carta de apresentação profissional em Markdown. Formal, personalizada para a vaga." },
      { role: "user", content: `Vaga: ${job.title} na ${job.company}\n\nDescrição: ${job.description || ""}\n\nPerfil: ${(profile || "").substring(0, 1000)}` }
    ])
    
    // Step 4: Revisão por segundo agente
    result.review = await callJson(providerType, client, m, [
      { role: "system", content: "Revise o currículo e carta gerados. Retorne JSON: {issues:[{severity, item, suggestion}], atsScore:0-100, improvements:[string]}" },
      { role: "user", content: `Currículo:\n${result.cv}\n\nCarta:\n${result.coverLetter}\n\nVaga: ${job.title} na ${job.company}` }
    ])
    
    // Step 5: Versão final revisada
    result.finalCv = await callText(providerType, client, m, [
      { role: "system", content: "Incorpore as revisões e gere a versão final do currículo em Markdown." },
      { role: "assistant", content: `Currículo original:\n${result.cv}` },
      { role: "assistant", content: `Revisões: ${JSON.stringify(result.review.issues || [])}` }
    ])
    
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
