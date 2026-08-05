import { CandidateProfile } from "@/lib/db/profile-schema"
import { getDb } from "@/lib/db"

export interface FitResult {
  score: number
  fit: "strong" | "moderate" | "weak"
  strengths: string[]
  gaps: string[]
  reasoning: string
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

  // 1. Skill Overlap (Peso 40%)
  const allProfileSkills = [
    ...profile.skills.primary,
    ...profile.skills.secondary,
    ...profile.skills.tools,
  ]

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
  const skillScore = Math.min((skillMatches / maxSkillsToCheck) * 100 * 2, 100) // Normaliza proporção

  // Identifica potenciais gaps
  const commonReqs = ["aws", "docker", "kubernetes", "python", "react", "node", "typescript", "java", "sql", "graphql"]
  for (const req of commonReqs) {
    if (fullText.includes(req) && !allProfileSkills.some((s) => s.toLowerCase().includes(req))) {
      if (gaps.length < 3) {
        gaps.push(`Requisito de ${req.toUpperCase()} não destacado no perfil`)
      }
    }
  }

  // 2. Role & Title Match (Peso 30%)
  let titleScore = 0
  const targetRoles = profile.targetPreferences.targetRoles.length > 0
    ? profile.targetPreferences.targetRoles
    : [profile.identity.headline]

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

  // 3. Location & Work Mode (Peso 20%)
  let locationScore = 70 // Padrão razoável se não restrito
  const locText = (job.location || "").toLowerCase()
  const isRemoteJob = locText.includes("remoto") || locText.includes("remote") || locText.includes("home office")

  if (isRemoteJob) {
    locationScore = 100
    strengths.push("Modelo de trabalho Remoto alinhado")
  } else if (profile.identity.location && locText.includes(profile.identity.location.toLowerCase())) {
    locationScore = 90
    strengths.push(`Localização (${job.location}) compatível`)
  } else {
    // Verifica dealbreakers
    for (const dealbreaker of profile.targetPreferences.dealbreakers) {
      if (dealbreaker.toLowerCase().includes("presencial") && (locText.includes("onsite") || locText.includes("presencial"))) {
        locationScore = 20
        gaps.push("Vaga exige presencial (viola restrição estipulada)")
        break
      }
    }
  }

  // 4. Sector & Growth Match (Peso 10%)
  let sectorScore = 50
  for (const sector of profile.targetPreferences.targetSectors) {
    if (sector && fullText.includes(sector.toLowerCase())) {
      sectorScore = 100
      strengths.push(`Setor de atuação (${sector}) é um alvo prioritário`)
      break
    }
  }

  // Pontuação Ponderada Final (0-100)
  const finalScore = Math.round(
    skillScore * 0.4 + titleScore * 0.3 + locationScore * 0.2 + sectorScore * 0.1
  )

  let fit: "strong" | "moderate" | "weak" = "weak"
  if (finalScore >= 70) {
    fit = "strong"
  } else if (finalScore >= 45) {
    fit = "moderate"
  }

  const reasoning = `Pontuação final de ${finalScore}/100. Fit classificado como ${fit.toUpperCase()}. Alinhamento de competências (${Math.round(skillScore)}%), compatibilidade de título (${Math.round(titleScore)}%) e aderência de localização/modalidade (${Math.round(locationScore)}%).`

  return {
    score: finalScore,
    fit,
    strengths: Array.from(new Set(strengths)),
    gaps: Array.from(new Set(gaps)),
    reasoning,
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
