import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"
import { completeJson, completeText, getDefaultModel, getReviewModel } from "@/lib/inference/bifrost"
import { dataPath } from "@/lib/runtime/data-directory"

// Arquitetura: UI → CT223 → lib/inference/bifrost.ts → CT109.
// As credenciais ficam no servidor; nada de apiKey/provider/model vindo do cliente.

async function loadCandidateProfileText(givenProfile?: string): Promise<string> {
  if (givenProfile && givenProfile.trim().length > 20) {
    return givenProfile.trim()
  }

  // 1. Tenta carregar do profile.json ($LIA_DATA_DIR/profile/profile.json)
  try {
    const jsonPath = dataPath("profile", "profile.json")
    const jsonStr = await fs.readFile(jsonPath, "utf8")
    const p = JSON.parse(jsonStr)
    if (p && typeof p === "object") {
      const parts: string[] = []
      if (p.name) parts.push(`Nome: ${p.name}`)
      if (p.email) parts.push(`Email: ${p.email}`)
      if (p.phone) parts.push(`Telefone: ${p.phone}`)
      if (p.location) parts.push(`Localização: ${p.location}`)
      if (p.skills) {
        const primary = Array.isArray(p.skills.primary) ? p.skills.primary.join(", ") : ""
        const secondary = Array.isArray(p.skills.secondary) ? p.skills.secondary.join(", ") : ""
        parts.push(`Habilidades: ${primary} ${secondary}`)
      }
      if (Array.isArray(p.experience) && p.experience.length > 0) {
        parts.push("Experiência Profissional:")
        p.experience.forEach((exp: any) => {
          parts.push(`- ${exp.title || ""} na ${exp.company || ""} (${exp.period || ""})`)
          if (Array.isArray(exp.achievements)) {
            exp.achievements.forEach((ach: string) => parts.push(`  * ${ach}`))
          }
        })
      }
      if (Array.isArray(p.education) && p.education.length > 0) {
        parts.push("Educação:")
        p.education.forEach((edu: any) => parts.push(`- ${edu.degree || ""} em ${edu.field || ""}, ${edu.institution || ""} (${edu.year || ""})`))
      }
      if (parts.length > 0) return parts.join("\n")
    }
  } catch {}

  // 2. Fallback: lê do 01-candidate-profile.md (.claude/...)
  try {
    const mdPath = path.join(process.cwd(), ".claude/skills/job-application-assistant/01-candidate-profile.md")
    const mdContent = await fs.readFile(mdPath, "utf8")
    if (mdContent && mdContent.trim().length > 20) return mdContent.trim()
  } catch {}

  return ""
}

export async function POST(request: Request) {
  try {
    const { job, profile } = await request.json()
    if (!job?.title) return NextResponse.json({ error: "Vaga inválida" }, { status: 400 })

    const profileText = await loadCandidateProfileText(profile)
    if (!profileText) {
      return NextResponse.json(
        { error: "Nenhum perfil de candidato encontrado. Envie seu currículo em Configurações para extrair seu perfil antes de gerar a candidatura." },
        { status: 400 },
      )
    }

    const defaultModel = getDefaultModel()
    const reviewModel = getReviewModel()
    const jobText = `${job.title} na ${job.company || "empresa"}${job.description ? `\n\nDescrição: ${job.description}` : ""}`

    const result: any = {}

    // Step 1: Avaliar fit (modelo padrão)
    result.evaluation = await completeJson({
      model: defaultModel,
      system: "Você é o avaliador oficial do Lia Job Search. Avalie o fit entre o perfil do candidato e a vaga com total fidelidade aos fatos. REGRA CRÍTICA: Nunca invente experiências. Retorne JSON em Português do Brasil: {fitScore:0-100, verdict:string, strengths:[string], gaps:[string], recommendation:string}",
      messages: [{ role: "user", content: `Perfil do Candidato:\n${profileText.substring(0, 4000)}\n\nVaga:\n${jobText}` }],
      maxTokens: 2000,
    })

    // Step 2: Gerar CV adaptado (modelo padrão)
    result.cv = await completeText({
      model: defaultModel,
      system: "Gere um currículo adaptado para esta vaga em Markdown em Português do Brasil (pt-BR). REGRA ABSOLUTA: Utilize apenas fatos e experiências reais descritas no perfil do candidato. Não invente cargos, tecnologias ou conquistas. Destaque e re-enquadre as habilidades verdadeiras para responder às exigências da vaga.",
      messages: [{ role: "user", content: `Perfil Real do Candidato:\n${profileText}\n\nVaga:\n${job.title} na ${job.company}\n\nDescrição:\n${job.description || ""}` }],
      maxTokens: 4000,
    })

    // Step 3: Gerar carta de apresentação (modelo padrão)
    result.coverLetter = await completeText({
      model: defaultModel,
      system: "Gere uma carta de apresentação profissional e personalizada para esta vaga em Português do Brasil (pt-BR). Formal, persuasiva e baseada estritamente no perfil verificado do candidato.",
      messages: [{ role: "user", content: `Vaga: ${job.title} na ${job.company}\n\nDescrição: ${job.description || ""}\n\nPerfil Real: ${profileText.substring(0, 2000)}` }],
      maxTokens: 4000,
    })

    // Step 4: Revisão por segundo agente (modelo de revisão)
    result.review = await completeJson({
      model: reviewModel,
      system: "Você é o agente revisor ATS e especialista em carreiras. Revise o currículo e a carta gerados. Retorne JSON em Português do Brasil: {issues:[{severity:'high'|'medium'|'low', item:string, suggestion:string}], atsScore:0-100, improvements:[string]}",
      messages: [{ role: "user", content: `Currículo:\n${result.cv}\n\nCarta:\n${result.coverLetter}\n\nVaga: ${job.title} na ${job.company}` }],
      maxTokens: 2000,
    })

    // Step 5: Versão final revisada (modelo de revisão)
    result.finalCv = await completeText({
      model: reviewModel,
      system: "Incorpore as sugestões da revisão ATS e gere a versão final otimizada do currículo em Markdown em Português do Brasil (pt-BR). Preserve a precisão factual.",
      messages: [
        { role: "assistant", content: `Currículo original:\n${result.cv}` },
        { role: "assistant", content: `Revisões ATS: ${JSON.stringify((result.review as any)?.issues || [])}` },
      ],
      maxTokens: 4000,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar documentos"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
