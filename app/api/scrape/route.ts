import { NextResponse } from "next/server"
import { spawnSync } from "child_process"
import { readFileSync, existsSync } from "fs"
import path from "path"
import { dataPath } from "@/lib/runtime/data-directory"
import { requireSession } from "@/lib/auth/server"

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

function isPortalEnabled(portal: Portal): boolean {
  const skillRoot = portal.cliPath.split("/cli/", 1)[0]
  const skillPath = path.join(process.cwd(), skillRoot, "SKILL.md")
  if (!existsSync(skillPath)) return false
  const content = readFileSync(skillPath, "utf-8")
  // Check YAML front-matter for enabled: false — anything else means enabled
  return !/^enabled:\s*false\b/m.test(content)
}

function runClijson(portal: Portal, query: string, location: string): { results: Record<string, unknown>[]; failed: boolean } {
  const args = ["run", portal.cliPath, "search", ...portal.buildArgs(query, location), "--format", "json"]
  let result = spawnSync("bun", args, {
    cwd: process.cwd(),
    timeout: 25_000,
    encoding: "utf-8",
    // Use shell on Windows so bun is resolved via PATH; on Unix prefer exec
    // directly for clean signal handling.
    shell: process.platform === "win32",
  })

  if (result.error || result.status !== 0) {
    const tsxArgs = ["tsx", portal.cliPath, "search", ...portal.buildArgs(query, location), "--format", "json"]
    result = spawnSync("npx", tsxArgs, {
      cwd: process.cwd(),
      timeout: 25_000,
      encoding: "utf-8",
      shell: process.platform === "win32",
    })
  }

  if (result.error || result.status !== 0) return { results: [], failed: true }
  try {
    const parsed = JSON.parse(result.stdout)
    return { results: (parsed?.results ?? []) as Record<string, unknown>[], failed: false }
  } catch {
    return { results: [], failed: true }
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
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized
  try {
    const body: {
      query?: string
      location?: string
    } = await request.json()

    let query = (body.query ?? "").trim()
    let location = (body.location ?? "").trim()

    if (!query) {
      try {
        const jsonProfilePath = dataPath("profile", "profile.json")
        if (existsSync(jsonProfilePath)) {
          const parsed = JSON.parse(readFileSync(jsonProfilePath, "utf-8"))
          query = parsed.role || (Array.isArray(parsed.skills?.primary) ? parsed.skills.primary.join(" ") : parsed.skills?.primary) || parsed.title || ""
          if (!location && parsed.location) location = String(parsed.location)
        }
      } catch {}
    }

    if (!query) {
      query = "desenvolvedor software"
    }

    // --- Collect results from all enabled portals ---------------------------
    const allJobs: JobResult[] = []
    const seenUrls = new Set<string>()
    const diagnostics: { portal: string; enabled: boolean; failed: boolean; returned: number }[] = []

    for (const portal of PORTALS) {
      if (!isPortalEnabled(portal)) {
        diagnostics.push({ portal: portal.name, enabled: false, failed: false, returned: 0 })
        continue
      }
      const { results: rawResults, failed } = runClijson(portal, query, location)
      let returned = 0
      for (const raw of rawResults) {
        const job = portal.normalize(raw, portal.name)
        if (!job) continue
        // Deduplicate by URL (skip empty URLs too)
        if (!job.url) continue
        const key = canonicalJobUrl(job.url)
        if (seenUrls.has(key)) continue
        seenUrls.add(key)
        allJobs.push(job)
        returned++
      }
      diagnostics.push({ portal: portal.name, enabled: true, failed, returned })
    }

    // Filter results by location if a target location was specified
    let filteredJobs = allJobs
    if (location) {
      const locLower = location.toLowerCase()
      const isBrazilQuery = locLower.includes("brasil") || locLower.includes("brazil") || locLower === "br"
      filteredJobs = allJobs.filter((job) => {
        if (!job.location) return true
        const jobLoc = job.location.toLowerCase()
        if (jobLoc.includes(locLower)) return true
        if (jobLoc.includes("remote") || jobLoc.includes("remoto") || jobLoc.includes("home office")) return true
        if (isBrazilQuery && (jobLoc.includes("brasil") || jobLoc.includes("brazil") || jobLoc.includes("br") || jobLoc.includes("saul") || jobLoc.includes("paulo") || jobLoc.includes("rio"))) return true
        return false
      })
    }

    return NextResponse.json({ results: filteredJobs, sourceDiagnostics: diagnostics })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}


