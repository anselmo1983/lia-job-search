import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"

export async function POST(request: Request) {
  try {
    const { jobs, apiKey, provider, profile } = await request.json()
    if (!apiKey) return NextResponse.json({ error: "API key necessária" }, { status: 400 })
    
    const profileText = profile || "Perfil profissional a ser avaliado contra as vagas."
    
    let ranked: any[]
    
    if (provider === "openai") {
      const OpenAI = (await import("openai")).default
      const openai = new OpenAI({ apiKey })
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Você é um avaliador de vagas. Analise cada vaga contra o perfil do candidato. Retorne JSON: {rankings: [{id, score:0-100, verdict:"strong fit"|"good fit"|"moderate fit"|"weak fit", reasoning:"breve justificativa"}]}` },
          { role: "user", content: `Perfil: ${profileText.substring(0, 2000)}\n\nVagas para classificar:\n${JSON.stringify(jobs.map((j: any) => ({id: j.id || j.key, title: j.title, company: j.company, description: j.description || ""})))}` }
        ],
        response_format: { type: "json_object" }
      })
      
      const result = JSON.parse(response.choices[0].message.content || "{}")
      ranked = result.rankings || []
    } else {
      const Anthropic = (await import("@anthropic-ai/sdk")).default
      const anthropic = new Anthropic({ apiKey })
      
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: `Classifique estas vagas contra o perfil. Retorne JSON: {rankings: [{id, score:0-100, verdict, reasoning}]}\n\nPerfil: ${profileText.substring(0, 2000)}\n\nVagas:\n${JSON.stringify(jobs.map((j: any) => ({id: j.id || j.key, title: j.title, company: j.company})))}` }]
      })
      
      const content = response.content[0]
      const text = content.type === 'text' ? content.text : ""
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      ranked = jsonMatch ? JSON.parse(jsonMatch[0]).rankings || [] : []
    }
    
    // Atualizar seen_jobs.json com os scores
    const jobsPath = path.join(process.cwd(), "job_scraper", "seen_jobs.json")
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
    
    return NextResponse.json({ rankings: ranked })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
