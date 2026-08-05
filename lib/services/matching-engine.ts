import { CandidateProfile, getProfileSkillsList } from "@/lib/db/profile-schema"
import { getDb } from "@/lib/db"

export interface SubScores {
  skillScore: number
  titleScore: number
  locationScore: number
  sectorScore: number
  energyScore: number
}

export type ActionRecommendation = "apply_immediately" | "tailor_and_apply" | "skip"

export interface FitResult {
  score: number
  fit: "strong" | "moderate" | "weak"
  recommendation: ActionRecommendation
  strengths: string[]
  gaps: string[]
  dealbreakersTriggered: string[]
  reasoning: string
  subScores: SubScores
}

export interface JobInput {
  title: string
  description: string
  company?: string
  location?: string
}

export function calculateJobFit(job: JobInput, profile: CandidateProfile): FitResult {
  const fullText = `${job.title} ${job.description} ${job.company || ""} ${job.location || ""}`.toLowerCase()
  const titleLower = job.title.toLowerCase()

  const strengths: string[] = []
  const gaps: string[] = []
  const dealbreakersTriggered: string[] = []

  // 1. Skill & Evidence Overlap (Peso 40%)
  const allProfileSkills = getProfileSkillsList(profile)

  let skillMatches = 0
  for (const skill of allProfileSkills) {
    if (!skill) continue
    if (fullText.includes(skill.toLowerCase())) {
      skillMatches++
      if (strengths.length < 5) {
        strengths.push(`Domínio de ${skill}`)
      }
    }
  }

  const maxSkillsToCheck = Math.max(allProfileSkills.length, 1)
  const skillScore = Math.min((skillMatches / maxSkillsToCheck) * 100 * 2, 100)

  // Identifica potenciais gaps
  const commonReqs = ["aws", "docker", "kubernetes", "python", "react", "node", "typescript", "java", "sql", "graphql"]
  for (const req of commonReqs) {
    if (fullText.includes(req) && !allProfileSkills.some((s) => s.toLowerCase().includes(req))) {
      if (gaps.length < 3) {
        gaps.push(`Requisito de ${req.toUpperCase()} não destacado no perfil`)
      }
    }
  }

  // 2. Role & Title Match (Peso 25%)
  let titleScore = 0
  const targetRoles = profile.targetPreferences.targetRoles.length > 0
    ? profile.targetPreferences.targetRoles
    : [profile.identity.headline].filter(Boolean)

  for (const targetRole of targetRoles) {
    if (!targetRole) continue
    const roleLower = targetRole.toLowerCase()
    const words = roleLower.split(/\s+/).filter((w) => w.length > 3)

    const matchesCount = words.filter((w) => titleLower.includes(w)).length
    if (matchesCount > 0) {
      titleScore = Math.max(titleScore, (matchesCount / words.length) * 100)
      strengths.push(`Título alinhado com o objetivo (${targetRole})`)
      break
    }
  }

  if (titleScore === 0 && profile.identity.headline) {
    const headlineWords = profile.identity.headline.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    const matchesHeadline = headlineWords.filter((w) => titleLower.includes(w)).length
    if (matchesHeadline > 0) {
      titleScore = (matchesHeadline / headlineWords.length) * 80
    }
  }

  // 3. Location & Work Mode (Peso 15%)
  let locationScore = 70
  const locText = (job.location || "").toLowerCase()
  const isRemoteJob = locText.includes("remoto") || locText.includes("remote") || locText.includes("home office")

  if (isRemoteJob) {
    locationScore = 100
    strengths.push("Modelo de trabalho Remoto alinhado")
  } else if (profile.identity.location && locText.includes(profile.identity.location.toLowerCase())) {
    locationScore = 90
    strengths.push(`Localização (${job.location}) compatível`)
  }

  // 4. Sector & Domain Match (Peso 10%)
  let sectorScore = 50
  for (const sector of profile.targetPreferences.targetSectors) {
    if (sector && fullText.includes(sector.toLowerCase())) {
      sectorScore = 100
      strengths.push(`Setor de atuação (${sector}) é um alvo prioritário`)
      break
    }
  }

  // 5. Energy & Activity Fit (Peso 10%)
  let energyScore = 60
  const energizing = profile.preferences.energizingActivities || []
  const draining = profile.preferences.drainingActivities || []

  for (const act of energizing) {
    if (act && fullText.includes(act.toLowerCase())) {
      energyScore = Math.min(100, energyScore + 25)
      strengths.push(`Atividade energizante presente (${act})`)
    }
  }

  for (const act of draining) {
    if (act && fullText.includes(act.toLowerCase())) {
      energyScore = Math.max(0, energyScore - 30)
      gaps.push(`Atividade desgastante identificada (${act})`)
    }
  }

  // 6. Dealbreaker Checks
  const dealbreakerList = [
    ...(profile.constraints.dealbreakers || []),
    ...(profile.targetPreferences.dealbreakers || []),
  ]

  for (const dealbreaker of dealbreakerList) {
    if (!dealbreaker) continue
    const dbLower = dealbreaker.toLowerCase()

    if (dbLower.includes("presencial") && (locText.includes("onsite") || locText.includes("presencial"))) {
      dealbreakersTriggered.push("Vaga exige trabalho presencial")
      gaps.push("Viola restrição de trabalho presencial")
    } else if (fullText.includes(dbLower)) {
      dealbreakersTriggered.push(`Viola restrição estipulada: "${dealbreaker}"`)
      gaps.push(`Dealbreaker ativado: ${dealbreaker}`)
    }
  }

  // Pontuação Ponderada Final (0-100)
  let finalScore = Math.round(
    skillScore * 0.4 + titleScore * 0.25 + locationScore * 0.15 + sectorScore * 0.1 + energyScore * 0.1
  )

  if (dealbreakersTriggered.length > 0) {
    finalScore = Math.min(finalScore, 30)
  }

  let fit: "strong" | "moderate" | "weak" = "weak"
  let recommendation: ActionRecommendation = "skip"

  if (dealbreakersTriggered.length > 0) {
    fit = "weak"
    recommendation = "skip"
  } else if (finalScore >= 75) {
    fit = "strong"
    recommendation = "apply_immediately"
  } else if (finalScore >= 45) {
    fit = "moderate"
    recommendation = "tailor_and_apply"
  } else {
    fit = "weak"
    recommendation = "skip"
  }

  const reasoning = `Pontuação multidimensional: ${finalScore}/100. Classificação: ${fit.toUpperCase()}. Recomendação: ${recommendation.toUpperCase()}. Skills (${Math.round(skillScore)}%), Título (${Math.round(titleScore)}%), Localização (${Math.round(locationScore)}%), Setor (${Math.round(sectorScore)}%), Energia (${Math.round(energyScore)}%).`

  return {
    score: finalScore,
    fit,
    recommendation,
    strengths: Array.from(new Set(strengths)),
    gaps: Array.from(new Set(gaps)),
    dealbreakersTriggered: Array.from(new Set(dealbreakersTriggered)),
    reasoning,
    subScores: {
      skillScore: Math.round(skillScore),
      titleScore: Math.round(titleScore),
      locationScore: Math.round(locationScore),
      sectorScore: Math.round(sectorScore),
      energyScore: Math.round(energyScore),
    },
  }
}

export function evaluateAndSaveJobFit(jobId: string, profile: CandidateProfile): FitResult | null {
  const db = getDb()
  const jobRow = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as any
  if (!jobRow) return null

  const fitResult = calculateJobFit(
    {
      title: jobRow.title,
      description: jobRow.description || "",
      company: jobRow.company,
      location: jobRow.location,
    },
    profile
  )

  db.prepare(`
    UPDATE jobs
    SET score = ?, fit = ?, strengths = ?, gaps = ?, reasoning = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    fitResult.score,
    fitResult.fit,
    JSON.stringify(fitResult.strengths),
    JSON.stringify(fitResult.gaps),
    fitResult.reasoning,
    jobId
  )

  return fitResult
}

export function batchEvaluateJobs(
  jobIds?: string[],
  profile?: CandidateProfile
): { evaluatedCount: number; results: Array<{ jobId: string; fitResult: FitResult }> } {
  const db = getDb()
  if (!profile) {
    const { getProfileSync } = require("@/lib/db/profile-sync")
    profile = getProfileSync()
  }

  if (!profile) {
    return { evaluatedCount: 0, results: [] }
  }

  let jobRows: any[] = []
  if (jobIds && jobIds.length > 0) {
    const placeholders = jobIds.map(() => "?").join(",")
    jobRows = db.prepare(`SELECT * FROM jobs WHERE id IN (${placeholders})`).all(...jobIds)
  } else {
    jobRows = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC").all()
  }

  const results: Array<{ jobId: string; fitResult: FitResult }> = []

  for (const jobRow of jobRows) {
    const fitResult = calculateJobFit(
      {
        title: jobRow.title,
        description: jobRow.description || "",
        company: jobRow.company,
        location: jobRow.location,
      },
      profile
    )

    db.prepare(`
      UPDATE jobs
      SET score = ?, fit = ?, strengths = ?, gaps = ?, reasoning = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      fitResult.score,
      fitResult.fit,
      JSON.stringify(fitResult.strengths),
      JSON.stringify(fitResult.gaps),
      fitResult.reasoning,
      jobRow.id
    )

    results.push({ jobId: jobRow.id, fitResult })
  }

  return { evaluatedCount: results.length, results }
}

