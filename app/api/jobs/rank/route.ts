import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"

const jobsPath = path.join(process.cwd(), "job_scraper", "seen_jobs.json")

async function callAI(provider: string, apiKey: string, model: string, system: string, user: string): Promise<any> {
  if (provider === "anthropic") {
    const Anthropic = (await import("@anthropic-ai/sdk")).default
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: `${system}\n\n${user}` }]
    })
    const content = response.content[0]
    const text = content.type === "text" ? content.text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { rankings: [] }
  }
  
  const OpenAI = (await import("openai")).default
  const baseURL = provider === "kimi" ? "https://api.moonshot.ai/v1" : undefined
  const openai = new OpenAI({ apiKey, baseURL })
  const m = model || (provider === "kimi" ? "kimi-k2.6" : "gpt-4o-mini")
  
  const response = await openai.chat.completions.create({
    model: m,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    response_format: { type: "json_object" }
  })
  return JSON.parse(response.choices[0].message.content || "{}")
}

export async function POST(request: Request) {
  try {
    const { jobs, apiKey, provider = "openai", profile, model } = await request.json()
    if (!apiKey) return NextResponse.json({ error: "API key necessária" }, { status: 400 })
    
    const result = await callAI(provider, apiKey, model,
      "Você é um avaliador de vagas. Analise cada vaga contra o perfil do candidato. Retorne JSON: {rankings: [{id, score:0-100, verdict, reasoning}]}",
      `Perfil: ${(profile || "").substring(0, 2000)}\n\nVagas para classificar:\n${JSON.stringify(jobs.map((j: any) => ({id: j.id || j.key, title: j.title, company: j.company})))}`
    )
    
    const ranked = result.rankings || []
    
    // Atualizar seen_jobs.json com os scores
    try {
      const existing = JSON.parse(await fs.readFile(jobsPath, "utf8"))
      const existingArray = Array.isArray(existing) ? existing : existing.jobs || []
      for (const r of ranked) {
        const idx = existingArray.findIndex((j: any) => j.id === r.id || j.key === r.id)
        if (idx >= 0) {
          existingArray[idx].score = r.score
          existingArray[idx].fit = r.verdict
          existingArray[idx].status = "ranked"
          existingArray[idx].rank_date = new Date().toISOString()
        }
      }
      await fs.writeFile(jobsPath, JSON.stringify(existingArray, null, 2), "utf8")
    } catch {}
    
    return NextResponse.json({ rankings: ranked })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
