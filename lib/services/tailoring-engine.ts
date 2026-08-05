import { CandidateProfile } from "@/lib/db/profile-schema"
import { ResumeDocument, JsonPatchOperation } from "@/lib/db/resume-schema"
import { renderTailoredLatexCv, renderTailoredLatexCoverLetter } from "@/lib/services/latex-generator"

export interface ExtractedKeywords {
  technicalSkills: string[]
  softSkills: string[]
  toolsAndFrameworks: string[]
  domainKeywords: string[]
  allKeywords: string[]
}

export interface AtsMatchReport {
  matchScore: number // 0-100%
  matchedKeywords: string[]
  missingKeywords: string[]
  keywordCoverageDetails: Array<{ keyword: string; matched: boolean; category: string }>
  suggestedPatches?: Array<{ keyword: string; patch: JsonPatchOperation }>
}

export interface TailoredDocumentResult {
  docType: "cv" | "cover_letter" | "both"
  format: "latex" | "markdown" | "json"
  atsMatch: AtsMatchReport
  cvContent?: string
  coverLetterContent?: string
}

const COMMON_TECH_KEYWORDS = [
  "react", "next.js", "nextjs", "vue", "angular", "node.js", "nodejs", "express",
  "python", "django", "fastapi", "flask", "typescript", "javascript", "java", "spring",
  "c#", ".net", "golang", "go", "ruby", "rails", "php", "laravel",
  "sql", "postgresql", "postgres", "mysql", "mongodb", "redis", "sqlite",
  "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "terraform",
  "git", "ci/cd", "rest", "graphql", "microservices", "agile", "scrum",
  "unit testing", "jest", "cypress", "playwright", "devops", "ai", "llm"
]

const COMMON_SOFT_KEYWORDS = [
  "liderança", "leadership", "comunicação", "communication", "trabalho em equipe",
  "teamwork", "resolução de problemas", "problem solving", "autonomia", "proatividade",
  "gestão de tempo", "metodologia ágil", "ownership"
]

export function extractJobKeywords(jobDescription: string): ExtractedKeywords {
  const textLower = jobDescription.toLowerCase()
  const technicalSkills: string[] = []
  const softSkills: string[] = []
  const toolsAndFrameworks: string[] = []
  const domainKeywords: string[] = []

  for (const kw of COMMON_TECH_KEYWORDS) {
    if (textLower.includes(kw)) {
      if (["react", "node.js", "python", "typescript", "java", "golang", "c#"].includes(kw)) {
        technicalSkills.push(kw)
      } else {
        toolsAndFrameworks.push(kw)
      }
    }
  }

  for (const kw of COMMON_SOFT_KEYWORDS) {
    if (textLower.includes(kw)) {
      softSkills.push(kw)
    }
  }

  const allKeywords = Array.from(new Set([
    ...technicalSkills,
    ...softSkills,
    ...toolsAndFrameworks,
    ...domainKeywords,
  ]))

  return {
    technicalSkills: Array.from(new Set(technicalSkills)),
    softSkills: Array.from(new Set(softSkills)),
    toolsAndFrameworks: Array.from(new Set(toolsAndFrameworks)),
    domainKeywords: Array.from(new Set(domainKeywords)),
    allKeywords,
  }
}

export function calculateAtsKeywordMatch(keywords: ExtractedKeywords, profile: CandidateProfile): AtsMatchReport {
  const profileText = JSON.stringify(profile).toLowerCase()

  const matchedKeywords: string[] = []
  const missingKeywords: string[] = []
  const keywordCoverageDetails: Array<{ keyword: string; matched: boolean; category: string }> = []

  for (const kw of keywords.allKeywords) {
    const isMatched = profileText.includes(kw)
    if (isMatched) {
      matchedKeywords.push(kw)
    } else {
      missingKeywords.push(kw)
    }

    let category = "Domain"
    if (keywords.technicalSkills.includes(kw)) category = "Technical"
    else if (keywords.softSkills.includes(kw)) category = "Soft Skill"
    else if (keywords.toolsAndFrameworks.includes(kw)) category = "Tool/Framework"

    keywordCoverageDetails.push({ keyword: kw, matched: isMatched, category })
  }

  const total = keywords.allKeywords.length
  const matchScore = total > 0 ? Math.round((matchedKeywords.length / total) * 100) : 100

  return {
    matchScore,
    matchedKeywords,
    missingKeywords,
    keywordCoverageDetails,
  }
}

export function calculateResumeDocumentAtsMatch(doc: ResumeDocument, jobDescription: string): AtsMatchReport {
  const keywords = extractJobKeywords(jobDescription)
  const docText = JSON.stringify(doc).toLowerCase()

  const matchedKeywords: string[] = []
  const missingKeywords: string[] = []
  const keywordCoverageDetails: Array<{ keyword: string; matched: boolean; category: string }> = []
  const suggestedPatches: Array<{ keyword: string; patch: JsonPatchOperation }> = []

  for (const kw of keywords.allKeywords) {
    const isMatched = docText.includes(kw)
    if (isMatched) {
      matchedKeywords.push(kw)
    } else {
      missingKeywords.push(kw)
      // Gerar patch sugerido para incluir palavra-chave nas competências do currículo
      suggestedPatches.push({
        keyword: kw,
        patch: {
          op: "add",
          path: "/sections/skills/primary/-",
          value: kw.charAt(0).toUpperCase() + kw.slice(1),
        },
      })
    }

    let category = "Domain"
    if (keywords.technicalSkills.includes(kw)) category = "Technical"
    else if (keywords.softSkills.includes(kw)) category = "Soft Skill"
    else if (keywords.toolsAndFrameworks.includes(kw)) category = "Tool/Framework"

    keywordCoverageDetails.push({ keyword: kw, matched: isMatched, category })
  }

  const total = keywords.allKeywords.length
  const matchScore = total > 0 ? Math.round((matchedKeywords.length / total) * 100) : 100

  return {
    matchScore,
    matchedKeywords,
    missingKeywords,
    keywordCoverageDetails,
    suggestedPatches,
  }
}

export function buildAtsTailoringPrompt(job: { title: string; company: string; description: string }, profile: CandidateProfile) {
  const keywords = extractJobKeywords(job.description || "")
  const matchReport = calculateAtsKeywordMatch(keywords, profile)

  return {
    systemPrompt: `Você é um especialista sênior em redação de currículos otimizados para ATS (Applicant Tracking Systems). 
REGRA FUNDAMENTAL: Utilize APENAS fatos reais contidos no perfil fornecido. NUNCA invente empregos, datas ou tecnologias.
Sua missão é re-enquadrar os destaques do candidato priorizando as palavras-chave identificadas no anúncio da vaga para atingir pontuação máxima em scanners ATS.`,

    userPrompt: `Vaga: ${job.title} na ${job.company}
Descrição da Vaga:
${job.description}

Palavras-chave extraídas da Vaga:
- Técnicas: ${keywords.technicalSkills.join(", ") || "N/A"}
- Ferramentas: ${keywords.toolsAndFrameworks.join(", ") || "N/A"}
- Soft Skills: ${keywords.softSkills.join(", ") || "N/A"}

Relatório de Cobertura Atual: ${matchReport.matchScore}% de correspondência.
Palavras-chave já presentes no perfil: ${matchReport.matchedKeywords.join(", ") || "Nenhuma"}
Palavras-chave ausentes: ${matchReport.missingKeywords.join(", ") || "Nenhuma"}

Perfil do Candidato:
${JSON.stringify(profile, null, 2)}

Por favor, gere o currículo otimizado destacando as conquistas mais relevantes.`,
  }
}

export function generateTailoredDocument(
  job: { title: string; company: string; description?: string },
  profile: CandidateProfile,
  docType: "cv" | "cover_letter" | "both" = "cv",
  format: "latex" | "markdown" | "json" = "latex"
): TailoredDocumentResult {
  const keywords = extractJobKeywords(job.description || "")
  const atsMatch = calculateAtsKeywordMatch(keywords, profile)

  let cvContent: string | undefined
  let coverLetterContent: string | undefined

  if (docType === "cv" || docType === "both") {
    if (format === "latex") {
      cvContent = renderTailoredLatexCv(profile, job)
    } else if (format === "markdown") {
      cvContent = `# ${profile.identity.fullName} - CV (${job.title} @ ${job.company})\n\n## Summary\n${profile.identity.summary}\n\n## Experience\n` +
        profile.experiences.map((e) => `- **${e.role}** (${e.startDate}-${e.endDate}) - ${e.company}\n  ${e.highlights.join("\n  ")}`).join("\n")
    } else {
      cvContent = JSON.stringify({ profile, job, atsMatch }, null, 2)
    }
  }

  if (docType === "cover_letter" || docType === "both") {
    if (format === "latex") {
      coverLetterContent = renderTailoredLatexCoverLetter(profile, job)
    } else if (format === "markdown") {
      coverLetterContent = `# Cover Letter for ${job.title} at ${job.company}\n\nDear Hiring Manager,\n\nI am writing to express my strong interest in the ${job.title} role at ${job.company}...\n`
    } else {
      coverLetterContent = JSON.stringify({ coverLetter: true, profile, job }, null, 2)
    }
  }

  return {
    docType,
    format,
    atsMatch,
    cvContent,
    coverLetterContent,
  }
}
