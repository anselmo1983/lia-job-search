import { NextResponse } from "next/server"
import { spawnSync } from "child_process"
import { readFileSync, existsSync } from "fs"
import path from "path"

// ---------------------------------------------------------------------------

interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  url: string
  description: string
  date: string
  source: string
  status: string
  fit: string
  score: number | null
}

type Normalizer = (raw: Record<string, unknown>, source: string) => JobResult | null

const SKILLS_DIR = path.join(process.cwd(), ".agents", "skills")

// ---------------------------------------------------------------------------
// Portal definitions
// ---------------------------------------------------------------------------

interface Portal {
  name: string
  /** Relative path from project root to the CLI entry point (forward slashes). */
  cliPath: string
  /** Build the CLI arguments (excluding the command name 'search'). Returns flat
   *  array of arguments — e.g. ["-q", "python dev", "--jobage", "30"]. */
  buildArgs: (query: string, location: string) => string[]
  /** Normalize a raw result row into the unified JobResult shape. */
  normalize: Normalizer
}

function isPortalEnabled(skillName: string): boolean {
  const skillPath = path.join(SKILLS_DIR, skillName, "SKILL.md")
  if (!existsSync(skillPath)) return false
  const content = readFileSync(skillPath, "utf-8")
  // Check YAML front-matter for enabled: false — anything else means enabled
  return !/^enabled:\s*false\b/m.test(content)
}

function runClijson(portal: Portal, query: string, location: string): Record<string, unknown>[] {
  const args = ["run", portal.cliPath, "search", ...portal.buildArgs(query, location), "--format", "json"]
  const result = spawnSync("bun", args, {
    cwd: process.cwd(),
    timeout: 25_000,
    encoding: "utf-8",
    // Use shell on Windows so bun is resolved via PATH; on Unix prefer exec
    // directly for clean signal handling.
    shell: process.platform === "win32",
  })
  if (result.error || result.status !== 0) return []
  try {
    const parsed = JSON.parse(result.stdout)
    return (parsed?.results ?? []) as Record<string, unknown>[]
  } catch {
    return []
  }
}

// ---- linkedin-search -------------------------------------------------------
const linkedin: Portal = {
  name: "linkedin",
  cliPath: ".agents/skills/linkedin-search/cli/src/cli.ts",
  buildArgs: (query, location) => {
    const args = ["-q", query]
    if (location) args.push("-l", location)
    else args.push("-l", "Remote")
    args.push("--jobage", "30")
    return args
  },
  normalize: (raw, source) => {
    const id = raw.id ?? ""
    if (!id) return null
    return {
      id: `${source}_${id}`,
      title: String(raw.title ?? "(untitled)"),
      company: raw.company ? String(raw.company) : null,
      location: raw.location ? String(raw.location) : null,
      url: raw.url ? String(raw.url) : "",
      description: "",
      date: raw.date ? String(raw.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      status: "discovered",
      fit: "unrated",
      score: null,
    }
  },
}

// ---- freehire-search -------------------------------------------------------
const freehire: Portal = {
  name: "freehire",
  cliPath: ".agents/skills/freehire-search/cli/src/cli.ts",
  buildArgs: (query, _location) => {
    return ["-q", query, "--limit", "15"]
  },
  normalize: (raw, source) => {
    const id = raw.id ?? ""
    if (!id) return null
    return {
      id: `${source}_${id}`,
      title: String(raw.title ?? "(untitled)"),
      company: raw.company ? String(raw.company) : null,
      location: raw.location ? String(raw.location) : null,
      url: raw.url ? String(raw.url) : "",
      description: raw.description ? String(raw.description) : "",
      date: raw.date ? String(raw.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      status: "discovered",
      fit: "unrated",
      score: null,
    }
  },
}

// ---- jobindex-search -------------------------------------------------------
const jobindex: Portal = {
  name: "jobindex",
  cliPath: ".agents/skills/jobindex-search/cli/src/cli.ts",
  buildArgs: (query, location) => {
    const q = location ? `${query} ${location}` : query
    return ["-q", q, "--jobage", "30"]
  },
  normalize: (raw, source) => {
    const id = raw.id ?? ""
    if (!id) return null
    return {
      id: `${source}_${id}`,
      title: String(raw.title ?? "(untitled)"),
      company: raw.company ? String(raw.company) : null,
      location: raw.location ? String(raw.location) : null,
      url: raw.url ? String(raw.url) : "",
      description: raw.description ? String(raw.description) : "",
      date: raw.date ? String(raw.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      status: "discovered",
      fit: "unrated",
      score: null,
    }
  },
}

// ---- jobbank-search --------------------------------------------------------
const jobbank: Portal = {
  name: "jobbank",
  cliPath: ".agents/skills/jobbank-search/cli/src/cli.ts",
  buildArgs: (query, _location) => {
    return ["--key", query]
  },
  normalize: (raw, source) => {
    const id = raw.id ?? ""
    if (!id) return null
    return {
      id: `${source}_${id}`,
      title: String(raw.title ?? "(untitled)"),
      company: raw.company ? String(raw.company) : null,
      location: raw.location ? String(raw.location) : null,
      url: raw.url ? String(raw.url) : "",
      description: raw.description ? String(raw.description) : "",
      date: raw.posted ? String(raw.posted).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      status: "discovered",
      fit: "unrated",
      score: null,
    }
  },
}

// ---- jobdanmark-search -----------------------------------------------------
const jobdanmark: Portal = {
  name: "jobdanmark",
  cliPath: ".agents/skills/jobdanmark-search/cli/src/cli.ts",
  buildArgs: (query, location) => {
    const args: string[] = []
    if (query) args.push("--text", query)
    if (location && !/^\d/.test(location)) args.push("--municipality", location)
    return args
  },
  normalize: (raw, source) => {
    if (!raw.title) return null
    const id = raw.slug ? String(raw.slug) : String(raw.url ?? Math.random())
    return {
      id: `${source}_${id}`,
      title: String(raw.title ?? "(untitled)"),
      company: raw.companyName ? String(raw.companyName) : null,
      location: raw.companyAddress ? String(raw.companyAddress) : null,
      url: raw.url ? String(raw.url) : "",
      description: "",
      date: raw.publishedDate ? String(raw.publishedDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      status: "discovered",
      fit: "unrated",
      score: null,
    }
  },
}

// ---- jobnet-search ---------------------------------------------------------
const jobnet: Portal = {
  name: "jobnet",
  cliPath: ".agents/skills/jobnet-search/cli/src/cli.ts",
  buildArgs: (query, _location) => {
    return ["--search-string", query, "--per-page", "10"]
  },
  normalize: (raw, source) => {
    const id = raw.jobAdId ?? ""
    if (!id) return null
    const mun = raw.municipality ? String(raw.municipality) : null
    const pc = raw.postalCode ? String(raw.postalCode) : null
    const district = raw.postalDistrictName ? String(raw.postalDistrictName) : null
    const loc = [mun, pc, district].filter(Boolean).join(", ") || null
    return {
      id: `${source}_${id}`,
      title: String(raw.title ?? "(untitled)"),
      company: raw.hiringOrgName ? String(raw.hiringOrgName) : null,
      location: loc,
      url: raw.jobAdId ? `https://jobnet.dk/job/${raw.jobAdId}` : "",
      description: "",
      date: raw.publicationDate ? String(raw.publicationDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      status: "discovered",
      fit: "unrated",
      score: null,
    }
  },
}

// ---- indeed-br-search -----------------------------------------------------
const indeedbr: Portal = {
  name: "indeed-br",
  cliPath: ".agents/skills/indeed-br-search/cli/src/cli.ts",
  buildArgs: (query, location) => {
    const args = ["-q", query]
    if (location) args.push("-l", location)
    else args.push("-l", "Brasil")
    args.push("--limit", "15")
    return args
  },
  normalize: (raw, source) => {
    const id = raw.id ?? ""
    if (!id) return null
    return {
      id: `${source}_${id}`,
      title: String(raw.title ?? "(untitled)"),
      company: raw.company ? String(raw.company) : null,
      location: raw.location ? String(raw.location) : null,
      url: raw.url ? String(raw.url) : "",
      description: raw.description ? String(raw.description) : "",
      date: raw.date ? String(raw.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      status: "discovered",
      fit: "unrated",
      score: null,
    }
  },
}

// ---------------------------------------------------------------------------
// Portal registry – checked in order; linkedin + freehire first (broadest)
// ---------------------------------------------------------------------------
const PORTALS: Portal[] = [linkedin, freehire, indeedbr, jobindex, jobbank, jobdanmark, jobnet]

// ---------------------------------------------------------------------------
// POST /api/scrape
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const body: {
      query?: string
      location?: string
      apiKey?: string
      provider?: string
      model?: string
    } = await request.json()

    const query = (body.query ?? "").trim()
    const location = (body.location ?? "").trim()

    if (!query) {
      return NextResponse.json({ error: "Parâmetro 'query' é obrigatório" }, { status: 400 })
    }

    // --- Collect results from all enabled portals ---------------------------
    const allJobs: JobResult[] = []
    const seenUrls = new Set<string>()

    for (const portal of PORTALS) {
      if (!isPortalEnabled(portal.name)) continue
      const rawResults = runClijson(portal, query, location)
      for (const raw of rawResults) {
        const job = portal.normalize(raw, portal.name)
        if (!job) continue
        // Deduplicate by URL (skip empty URLs too)
        if (!job.url) continue
        const key = job.url.replace(/[?#].*$/, "").toLowerCase()
        if (seenUrls.has(key)) continue
        seenUrls.add(key)
        allJobs.push(job)
      }
    }

    // If no CLI results at all, try LLM as last-resort fallback
    if (allJobs.length === 0 && body.apiKey) {
      return await llmFallback(body.apiKey, body.provider, body.model, query, location)
    }

    return NextResponse.json({ results: allJobs })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// LLM fallback – only used when NO CLI returned results AND an API key was
// provided. Returns a stub result set with a notice in the description.
// ---------------------------------------------------------------------------
async function llmFallback(
  apiKey: string,
  provider: string | undefined,
  model: string | undefined,
  query: string,
  location: string,
): Promise<Response> {
  try {
    // Dynamic import so the OpenAI dependency is not loaded unless needed
    const { default: OpenAI } = await import("openai")
    const baseURL = provider === "kimi" ? "https://api.moonshot.ai/v1" : undefined
    const openai = new OpenAI({ apiKey, baseURL })
    const m = model || (provider === "kimi" ? "kimi-k2.6" : "gpt-4o-mini")

    const response = await openai.chat.completions.create({
      model: m,
      messages: [
        {
          role: "system",
          content:
            "Você é um buscador de vagas. Retorne JSON: {results: [{title, company, location, url, description, date, source}]}. " +
            "AVISO: Os portais de vagas reais não retornaram resultados. " +
            "Se não conhecer vagas reais, retorne results vazio.",
        },
        {
          role: "user",
          content: `Busque vagas para "${query}" em "${location || "Brasil"}". Retorne apenas se conhecer vagas reais.`,
        },
      ],
      response_format: { type: "json_object" },
    })

    const result = JSON.parse(response.choices[0].message.content || "{}")

    return NextResponse.json({
      results: (result.results || []).map((r: Record<string, unknown>, i: number) => ({
        id: `llm_${Date.now()}_${i}`,
        title: r.title ?? "",
        company: r.company ?? null,
        location: r.location ?? null,
        url: r.url ?? "",
        description: `[AVISO GERADO POR IA — nenhum portal de vagas retornou resultados para "${query}"] ${r.description ?? ""}`,
        date: r.date ? String(r.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
        source: r.source ?? "llm",
        status: "discovered",
        fit: "unrated",
        score: null,
      })),
      warning: "Nenhum portal de vagas retornou resultados. As vagas acima foram geradas por IA e podem não ser reais.",
    })
  } catch (error) {
    return NextResponse.json({ results: [], warning: `Fallback LLM também falhou: ${String(error)}` })
  }
}
