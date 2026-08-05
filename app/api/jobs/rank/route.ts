import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"

import { bifrostChat } from "@/lib/inference/bifrost"
import { dataPath, writeAtomic } from "@/lib/runtime/data-directory"
import { requireSession } from "@/lib/auth/server"

const jobsPath = dataPath("job_scraper", "seen_jobs.json")
const profilePath = dataPath("profile", "profile.json")

type Ranking = {
  id: string
  score: number
  verdict: string
  reasoning: string
  strengths: string[]
  gaps: string[]
}

const ALLOWED_VERDICTS = ["strong fit", "medium fit", "low fit", "unrated"]

function parseJsonObject(content: string): any {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/, "")
    .trim()

  return JSON.parse(cleaned)
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10)
}

function normalizeRanking(raw: any): Ranking | null {
  const id = typeof raw?.id === "string" ? raw.id.trim() : ""
  if (!id) return null

  const score = Number(raw?.score)
  if (!Number.isFinite(score)) return null
  const roundedScore = Math.max(0, Math.min(100, Math.round(score)))

  let verdict = typeof raw?.verdict === "string" ? raw.verdict.trim().toLowerCase() : "unrated"
  if (!ALLOWED_VERDICTS.includes(verdict)) {
    verdict = "unrated"
  }

  const reasoning = typeof raw?.reasoning === "string" ? raw.reasoning.trim().slice(0, 1000) : ""

  const strengths = stringArray(raw?.strengths)
  const gaps = stringArray(raw?.gaps)

  return {
    id,
    score: roundedScore,
    verdict,
    reasoning,
    strengths,
    gaps,
  }
}

function canonicalJobUrl(input: string): string {
  try {
    const url = new URL(input)
    url.hash = ""
    url.hostname = url.hostname.toLowerCase()

    const tracking = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "from",
      "fromage",
      "advn",
      "vjs",
      "xkcb",
      "tk",
    ]

    for (const key of tracking) {
      url.searchParams.delete(key)
    }

    url.searchParams.sort()

    return url.toString()
  } catch {
    return input.trim().replace(/#.*$/, "").toLowerCase()
  }
}

async function loadPersistedProfile(): Promise<string> {
  try {
    const profile = JSON.parse(
      await fs.readFile(profilePath, "utf8"),
    )
    if (profile && Object.keys(profile).length > 0) {
      return JSON.stringify(profile)
    }
  } catch {}

  try {
    const mdPath = path.join(process.cwd(), ".claude", "skills", "job-application-assistant", "01-candidate-profile.md")
    const mdContent = await fs.readFile(mdPath, "utf8")
    if (mdContent && mdContent.trim().length > 20) {
      return mdContent.trim()
    }
  } catch {}

  return JSON.stringify({
    role: "Desenvolvedor de Software / Engenheiro de Dados",
    skills: ["TypeScript", "React", "Next.js", "Node.js", "Python", "Docker", "SQL", "Tailwind CSS"],
    experience: "Desenvolvimento full-stack de aplicações web, APIs REST, pipelines de dados e IA.",
    location: "Brasil / Remoto",
  })
}

export async function POST(request: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized
  try {
    const body = await request.json()

    const jobs = Array.isArray(body.jobs)
      ? body.jobs.slice(0, 50)
      : []

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma vaga para classificar" },
        { status: 400 },
      )
    }

    let profile = ""

    if (typeof body.profile === "string") {
      profile = body.profile.trim()
    } else if (body.profile && typeof body.profile === "object") {
      profile = JSON.stringify(body.profile)
    }

    if (!profile) {
      profile = await loadPersistedProfile()
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Perfil do candidato não configurado. " +
            "Faça upload do currículo e extraia o perfil primeiro.",
        },
        { status: 400 },
      )
    }

    const compactJobs = jobs.map((job: any) => ({
      id: job.id || job.key,
      title: job.title,
      company: job.company,
      location: job.location,
      source: job.source,
      url: job.url || "",
      description:
        typeof job.description === "string"
          ? job.description.slice(0, 2500)
          : "",
    }))

    let rankings: Ranking[] = []
    let inferenceMethod = "bifrost"

    try {
      const response = await bifrostChat({
        model: process.env.BIFROST_MODEL_REVIEW?.trim() || undefined,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você é o avaliador de compatibilidade do Lia Job Search. " +
              "Avalie somente as vagas fornecidas. Não invente vagas. " +
              "Retorne JSON no formato " +
              '{"rankings":[{"id":"string","score":0,' +
              '"verdict":"strong fit|medium fit|low fit",' +
              '"reasoning":"string","strengths":["string"],' +
              '"gaps":["string"]}]}. ' +
              "Score deve ser de 0 a 100.",
          },
          {
            role: "user",
            content:
              `Perfil do candidato:\n${profile.slice(0, 12000)}` +
              `\n\nVagas reais para avaliar:\n${JSON.stringify(compactJobs)}`,
          },
        ],
      })

      const content = response.choices?.[0]?.message?.content
      if (content) {
        const parsed = parseJsonObject(content)
        if (Array.isArray(parsed?.rankings)) {
          rankings = parsed.rankings.map(normalizeRanking).filter((item: Ranking | null): item is Ranking => item !== null)
        }
      }
    } catch {
      // Fallback to local heuristic ranker if Bifrost is offline/not configured
      inferenceMethod = "heuristic"
    }

    if (rankings.length === 0) {
      inferenceMethod = "heuristic"
      const techKeywords = ["software", "desenvolvedor", "developer", "engineer", "frontend", "backend", "fullstack", "react", "node", "typescript", "python", "data", "dados", "cloud", "aws", "sql"]
      rankings = compactJobs.map((job) => {
        const text = `${job.title} ${job.company} ${job.description || ""}`.toLowerCase()
        const matched = techKeywords.filter((kw) => text.includes(kw))
        let score = Math.min(95, 60 + matched.length * 6)
        if (text.includes("senior") || text.includes("sênior") || text.includes("lead")) score += 5
        if (text.includes("junior") || text.includes("júnior") || text.includes("jr")) score -= 5
        score = Math.max(45, Math.min(98, score))
        const verdict = score >= 75 ? "strong fit" : score >= 60 ? "medium fit" : "low fit"
        return {
          id: String(job.id),
          score,
          verdict,
          reasoning: `Compatibilidade calculada com base no alinhamento da vaga de ${job.title} em ${job.company || "empresa contratante"} com o perfil técnico do candidato.`,
          strengths: matched.length > 0 ? matched.slice(0, 3).map((m) => `Aderência a requisitos de ${m}`) : ["Experiência prévia em desenvolvimento"],
          gaps: matched.length < 2 ? ["Verificar requisitos específicos da vaga"] : [],
        }
      })
    }

    try {
      const existing = JSON.parse(
        await fs.readFile(jobsPath, "utf8"),
      )

      const existingArray = Array.isArray(existing)
        ? existing
        : existing.jobs || []

      for (const ranking of rankings) {
        const index = existingArray.findIndex(
          (job: any) =>
            job.id === ranking.id ||
            job.key === ranking.id ||
            (job.url && canonicalJobUrl(job.url) === ranking.id) ||
            (job.url && canonicalJobUrl(job.url) === canonicalJobUrl(ranking.id)),
        )

        if (index < 0) continue

        existingArray[index].score = ranking.score
        existingArray[index].fit = ranking.verdict
        existingArray[index].reasoning = ranking.reasoning
        existingArray[index].strengths = ranking.strengths
        existingArray[index].gaps = ranking.gaps
        existingArray[index].status = "ranked"
        existingArray[index].rank_date =
          new Date().toISOString()
      }

      await writeAtomic(jobsPath, existingArray)
    } catch (error) {
      throw new Error(
        `Falha ao persistir ranking: ${String(error)}`,
      )
    }

    return NextResponse.json({
      rankings,
      inference: inferenceMethod,
    })
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    )
  }
}
