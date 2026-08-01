import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"
import { completeJson, getDefaultModel } from "@/lib/inference/bifrost"

const jobsPath = path.join(process.cwd(), "job_scraper", "seen_jobs.json")

// Arquitetura: UI → CT223 → lib/inference/bifrost.ts → CT109.
// As credenciais ficam no servidor; nada de apiKey/provider/model vindo do cliente.

export async function POST(request: Request) {
  try {
    const { jobs, profile } = await request.json()
    if (!jobs?.length) return NextResponse.json({ error: "Lista de vagas vazia" }, { status: 400 })

    const result = await completeJson({
      model: getDefaultModel(),
      system: "Você é um avaliador de vagas. Analise cada vaga contra o perfil do candidato. Retorne JSON: {rankings: [{id, score:0-100, verdict, reasoning}]}",
      messages: [
        {
          role: "user",
          content: `Perfil: ${(profile || "").substring(0, 2000)}\n\nVagas para classificar:\n${JSON.stringify(jobs.map((j: any) => ({ id: j.id || j.key, title: j.title, company: j.company })))}`,
        },
      ],
      maxTokens: 3000,
    })

    const ranked = (result as any)?.rankings || []

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
    } catch {
      // persiste apenas se possível
    }

    return NextResponse.json({ rankings: ranked })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao classificar vagas"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
