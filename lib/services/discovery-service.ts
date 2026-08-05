import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { getDb } from "@/lib/db"
import { dataPath } from "@/lib/runtime/data-directory"

export interface DiscoveredJob {
  id: string
  externalId?: string
  title: string
  company: string
  location: string
  url: string
  description: string
  date: string
  source: string
  status: string
  fit: string
  score: number | null
  contentHash: string
}

export interface PortalDiagnostic {
  portal: string
  enabled: boolean
  failed: boolean
  returned: number
}

interface Portal {
  name: string
  cliPath: string
  buildArgs: (query: string, location: string) => string[]
  normalize: (raw: Record<string, unknown>, source: string) => DiscoveredJob | null
}

export function canonicalJobUrl(input: string): string {
  if (!input) return ""
  try {
    const url = new URL(input.trim())
    url.hash = ""
    url.hostname = url.hostname.toLowerCase()

    const trackingParams = [
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
      "ref",
      "sp",
    ]

    for (const param of trackingParams) {
      url.searchParams.delete(param)
    }

    url.searchParams.sort()
    return url.toString()
  } catch {
    return input.trim().replace(/#.*$/, "").toLowerCase()
  }
}

export function generateJobHash(title: string, company: string, url: string): string {
  const canonicalUrl = canonicalJobUrl(url)
  const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, " ")
  const normalizedCompany = company.toLowerCase().trim().replace(/\s+/g, " ")
  const rawString = `${normalizedTitle}|${normalizedCompany}|${canonicalUrl}`
  return crypto.createHash("sha256").update(rawString).digest("hex")
}

function isPortalEnabled(portal: Portal): boolean {
  const skillRoot = portal.cliPath.split("/cli/", 1)[0]
  const skillPath = path.join(process.cwd(), skillRoot, "SKILL.md")
  if (!fs.existsSync(skillPath)) return false
  const content = fs.readFileSync(skillPath, "utf-8")
  return !/^enabled:\s*false\b/m.test(content)
}

function runPortalCli(portal: Portal, query: string, location: string): { results: Record<string, unknown>[]; failed: boolean } {
  const args = ["run", portal.cliPath, "search", ...portal.buildArgs(query, location), "--format", "json"]
  let result = spawnSync("bun", args, {
    cwd: process.cwd(),
    timeout: 25_000,
    encoding: "utf-8",
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

// Portais Suportados
const linkedin: Portal = {
  name: "linkedin",
  cliPath: ".agents/skills/linkedin-search/cli/src/cli.ts",
  buildArgs: (q, l) => ["-q", q, "-l", l || "Remote", "--jobage", "30"],
  normalize: (raw, source) => {
    if (!raw.id || !raw.url) return null
    const title = String(raw.title || "(sem título)")
    const company = String(raw.company || "Empresa não informada")
    const url = String(raw.url)
    return {
      id: `${source}_${raw.id}`,
      externalId: String(raw.id),
      title,
      company,
      location: String(raw.location || "Remote"),
      url,
      description: "",
      date: raw.date ? String(raw.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      status: "discovered",
      fit: "unrated",
      score: null,
      contentHash: generateJobHash(title, company, url),
    }
  },
}

const freehire: Portal = {
  name: "freehire",
  cliPath: ".agents/skills/freehire-search/cli/src/cli.ts",
  buildArgs: (q) => ["-q", q, "--limit", "15"],
  normalize: (raw, source) => {
    if (!raw.id || !raw.url) return null
    const title = String(raw.title || "(sem título)")
    const company = String(raw.company || "Empresa não informada")
    const url = String(raw.url)
    return {
      id: `${source}_${raw.id}`,
      externalId: String(raw.id),
      title,
      company,
      location: String(raw.location || "Remoto"),
      url,
      description: String(raw.description || ""),
      date: raw.date ? String(raw.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      status: "discovered",
      fit: "unrated",
      score: null,
      contentHash: generateJobHash(title, company, url),
    }
  },
}

const indeedbr: Portal = {
  name: "indeed-br",
  cliPath: ".agents/skills/indeed-br-search/cli/src/cli.ts",
  buildArgs: (q, l) => ["-q", q, "-l", l || "Brasil", "--limit", "15"],
  normalize: (raw, source) => {
    if (!raw.id || !raw.url) return null
    const title = String(raw.title || "(sem título)")
    const company = String(raw.company || "Empresa não informada")
    const url = String(raw.url)
    return {
      id: `${source}_${raw.id}`,
      externalId: String(raw.id),
      title,
      company,
      location: String(raw.location || "Brasil"),
      url,
      description: String(raw.description || ""),
      date: raw.date ? String(raw.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      status: "discovered",
      fit: "unrated",
      score: null,
      contentHash: generateJobHash(title, company, url),
    }
  },
}

const jobindex: Portal = {
  name: "jobindex",
  cliPath: ".agents/skills/jobindex-search/cli/src/cli.ts",
  buildArgs: (q, l) => ["-q", l ? `${q} ${l}` : q, "--jobage", "30"],
  normalize: (raw, source) => {
    if (!raw.id || !raw.url) return null
    const title = String(raw.title || "(sem título)")
    const company = String(raw.company || "Empresa não informada")
    const url = String(raw.url)
    return {
      id: `${source}_${raw.id}`,
      externalId: String(raw.id),
      title,
      company,
      location: String(raw.location || "Dinamarca"),
      url,
      description: String(raw.description || ""),
      date: raw.date ? String(raw.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      status: "discovered",
      fit: "unrated",
      score: null,
      contentHash: generateJobHash(title, company, url),
    }
  },
}

const PORTALS: Portal[] = [linkedin, freehire, indeedbr, jobindex]

export async function runMultiSourceDiscovery(query: string, location: string) {
  const diagnostics: PortalDiagnostic[] = []
  const allJobs: DiscoveredJob[] = []
  const seenHashes = new Set<string>()

  for (const portal of PORTALS) {
    if (!isPortalEnabled(portal)) {
      diagnostics.push({ portal: portal.name, enabled: false, failed: false, returned: 0 })
      continue
    }

    const { results, failed } = runPortalCli(portal, query, location)
    let returned = 0

    for (const raw of results) {
      const job = portal.normalize(raw, portal.name)
      if (!job) continue

      if (seenHashes.has(job.contentHash)) continue
      seenHashes.add(job.contentHash)

      allJobs.push(job)
      returned++
    }

    diagnostics.push({ portal: portal.name, enabled: true, failed, returned })
  }

  // Persistência em SQLite se DB estiver ativo
  try {
    const db = getDb()
    const stmt = db.prepare(`
      INSERT INTO jobs (id, external_id, source, source_url, company, title, location, description, published_at, content_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        company = excluded.company,
        location = excluded.location,
        updated_at = datetime('now')
    `)

    for (const job of allJobs) {
      stmt.run(
        job.id,
        job.externalId || null,
        job.source,
        job.url,
        job.company,
        job.title,
        job.location,
        job.description,
        job.date,
        job.contentHash,
        job.status
      )
    }
  } catch (err) {
    console.error("Erro ao persistir vagas descobertas no SQLite:", err)
  }

  return { results: allJobs, sourceDiagnostics: diagnostics }
}
