import { CandidateProfile } from "@/lib/db/profile-schema"
import { extractJobKeywords } from "@/lib/services/tailoring-engine"
import { completeJson, getDefaultModel, bifrostConfigured } from "@/lib/inference/bifrost"

export interface GapSkillItem {
  skill: string
  category: "Technical" | "Tool/Framework" | "Soft Skill" | "Domain"
  demandCount: number
  demandPercentage: number
  impactOnMatch: number // Ex: +15%
  estimatedHours: number
  difficultyLevel: "Básico" | "Intermediário" | "Avançado"
}

export interface UpskillRoadmapItem {
  id: string
  skill: string
  title: string
  description: string
  actionItems: string[]
  suggestedProject: string
  estimatedHours: number
}

export interface UpskillReport {
  totalJobsAnalyzed: number
  overallSkillCoverage: number // 0-100%
  gapSkills: GapSkillItem[]
  roadmap: UpskillRoadmapItem[]
}

export function analyzeCandidateSkillGaps(
  profile: CandidateProfile,
  jobs: Array<{ title: string; company: string; description?: string }>
): UpskillReport {
  const profileText = JSON.stringify(profile).toLowerCase()
  const keywordFrequency: Record<string, { count: number; category: string }> = {}

  let totalJobsAnalyzed = 0

  jobs.forEach((job) => {
    if (!job.description) return
    totalJobsAnalyzed++
    const extracted = extractJobKeywords(job.description)

    extracted.technicalSkills.forEach((kw) => {
      if (!keywordFrequency[kw]) keywordFrequency[kw] = { count: 0, category: "Technical" }
      keywordFrequency[kw].count++
    })

    extracted.toolsAndFrameworks.forEach((kw) => {
      if (!keywordFrequency[kw]) keywordFrequency[kw] = { count: 0, category: "Tool/Framework" }
      keywordFrequency[kw].count++
    })

    extracted.softSkills.forEach((kw) => {
      if (!keywordFrequency[kw]) keywordFrequency[kw] = { count: 0, category: "Soft Skill" }
      keywordFrequency[kw].count++
    })
  })

  const gapSkills: GapSkillItem[] = []
  let matchedSkillCount = 0
  let totalUniqueKeywords = 0

  Object.entries(keywordFrequency).forEach(([skill, meta]) => {
    totalUniqueKeywords++
    const isPresent = profileText.includes(skill.toLowerCase())
    if (isPresent) {
      matchedSkillCount++
    } else {
      const demandPercentage =
        totalJobsAnalyzed > 0 ? Math.round((meta.count / totalJobsAnalyzed) * 100) : 0

      // Apenas considera como lacuna se aparecer em pelo menos 1 vaga
      if (meta.count >= 1) {
        let estimatedHours = 20
        let difficultyLevel: GapSkillItem["difficultyLevel"] = "Intermediário"

        if (["kubernetes", "aws", "gcp", "microservices", "system design"].includes(skill)) {
          estimatedHours = 40
          difficultyLevel = "Avançado"
        } else if (["git", "jest", "sqlite", "docker"].includes(skill)) {
          estimatedHours = 15
          difficultyLevel = "Básico"
        }

        const impactOnMatch = Math.min(25, Math.round(demandPercentage * 0.35) + 5)

        gapSkills.push({
          skill: skill.charAt(0).toUpperCase() + skill.slice(1),
          category: meta.category as any,
          demandCount: meta.count,
          demandPercentage,
          impactOnMatch,
          estimatedHours,
          difficultyLevel,
        })
      }
    }
  })

  // Ordenar lacunas pela maior demanda no mercado
  gapSkills.sort((a, b) => b.demandCount - a.demandCount)

  const overallSkillCoverage =
    totalUniqueKeywords > 0 ? Math.round((matchedSkillCount / totalUniqueKeywords) * 100) : 100

  // Gerar Roadmap de Aprendizado para os Top 4 Gaps
  const roadmap: UpskillRoadmapItem[] = gapSkills.slice(0, 4).map((gap, index) => {
    return {
      id: `roadmap-${index}-${gap.skill.toLowerCase()}`,
      skill: gap.skill,
      title: `Domínio Prático de ${gap.skill}`,
      description: `Requisitado por ${gap.demandCount} vaga(s) salvas (${gap.demandPercentage}% do seu mercado-alvo).`,
      actionItems: [
        `Estudar conceitos fundamentais de ${gap.skill}`,
        `Construir uma POC minimalista utilizando ${gap.skill}`,
        `Adicionar evidência prática no CandidateProfile (${gap.skill})`,
      ],
      suggestedProject: `Projeto Prático: Micro-serviço com ${gap.skill} e documentação técnica no GitHub.`,
      estimatedHours: gap.estimatedHours,
    }
  })

  return {
    totalJobsAnalyzed,
    overallSkillCoverage,
    gapSkills,
    roadmap,
  }
}

export async function analyzeCandidateSkillGapsWithAI(
  profile: CandidateProfile,
  jobs: Array<{ title: string; company: string; description?: string }>
): Promise<UpskillReport> {
  const baseReport = analyzeCandidateSkillGaps(profile, jobs)
  if (!bifrostConfigured() || baseReport.gapSkills.length === 0) {
    return baseReport
  }

  try {
    const topGaps = baseReport.gapSkills.slice(0, 4).map((g) => g.skill)
    const result = await completeJson({
      model: getDefaultModel(),
      system:
        "Você é o consultor de Upskilling Técnico da Lia. " +
        "Gere recomendações práticas e projetos de portfólio para os gaps de competência do candidato. " +
        "Retorne JSON no formato {roadmap:[{skill:string, title:string, description:string, actionItems:[string], suggestedProject:string, estimatedHours:number}]}",
      messages: [
        {
          role: "user",
          content: `Perfil do candidato: ${profile.identity.headline}\nSkills: ${JSON.stringify(profile.skills)}\n\nGaps prioritários identificados nas vagas: ${JSON.stringify(topGaps)}`,
        },
      ],
      maxTokens: 2000,
    })

    const parsedResult = result as any
    if (Array.isArray(parsedResult?.roadmap) && parsedResult.roadmap.length > 0) {
      baseReport.roadmap = parsedResult.roadmap.map((item: any, idx: number) => ({
        id: `ai-roadmap-${idx}-${(item.skill || "skill").toLowerCase()}`,
        skill: item.skill || topGaps[idx] || "Competência",
        title: item.title || `Mastery em ${item.skill}`,
        description: item.description || `Plano de ação focado em suprir a demanda do mercado.`,
        actionItems: Array.isArray(item.actionItems) ? item.actionItems : [`Aprender ${item.skill}`],
        suggestedProject: item.suggestedProject || `Projeto prático aplicando ${item.skill}`,
        estimatedHours: Number(item.estimatedHours) || 20,
      }))
    }
  } catch (err) {
    console.error("Erro na inteligência Bifrost de Upskilling (utilizando roadmap base):", err)
  }

  return baseReport
}
