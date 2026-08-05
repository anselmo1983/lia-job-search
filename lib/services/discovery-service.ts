import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { getDb } from "@/lib/db"
import { dataPath } from "@/lib/runtime/data-directory"

export type SourceTier = "tier0_ats" | "tier1_aggregator" | "tier2_scraper"

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
  tier: SourceTier
  status: string
  fit: string
  score: number | null
  urlHash: string
  contentHash: string
}

export interface PortalDiagnostic {
  portal: string
  tier: SourceTier
  enabled: boolean
  failed: boolean
  returned: number
}

export interface SourceAdapter {
  name: string
  tier: SourceTier
  cliPath: string
  buildArgs: (query: string, location: string) => string[]
  normalize: (raw: Record<string, unknown>, source: string, tier: SourceTier) => DiscoveredJob | null
}

export function canonicalJobUrl(input: string): string {
  if (!input) return ""
  try {
    const url = new URL(input.trim())
    url.hash = ""
    url.hostname = url.hostname.toLowerCase()

    // Remove barras no final do path
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1)
    }

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
      "gh_jid",
      "lipi",
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

export function generateUrlHash(url: string): string {
  const canonical = canonicalJobUrl(url)
  return crypto.createHash("sha256").update(canonical).digest("hex")
}

export function generateContentHash(title: string, company: string, descriptionSnippet: string): string {
  const normTitle = title.toLowerCase().trim().replace(/\s+/g, " ")
  const normCompany = company.toLowerCase().trim().replace(/\s+/g, " ")
  const normSnippet = descriptionSnippet.slice(0, 500).toLowerCase().trim().replace(/\s+/g, " ")
  const rawString = `${normTitle}|${normCompany}|${normSnippet}`
  return crypto.createHash("sha256").update(rawString).digest("hex")
}

export function generateJobHash(title: string, company: string, url: string, description = ""): string {
  return generateContentHash(title, company, description || canonicalJobUrl(url))
}

function isAdapterEnabled(adapter: SourceAdapter): boolean {
  const skillRoot = adapter.cliPath.split("/cli/", 1)[0]
  const skillPath = path.join(process.cwd(), skillRoot, "SKILL.md")
  if (!fs.existsSync(skillPath)) return false
  const content = fs.readFileSync(skillPath, "utf-8")
  return !/^enabled:\s*false\b/m.test(content)
}

function runAdapterCli(adapter: SourceAdapter, query: string, location: string): { results: Record<string, unknown>[]; failed: boolean } {
  let result: any = null

  try {
    const tsxArgs = [adapter.cliPath, "search", ...adapter.buildArgs(query, location), "--format", "json"]
    result = spawnSync("npx", ["tsx", ...tsxArgs], {
      cwd: process.cwd(),
      timeout: 25_000,
      encoding: "utf-8",
      shell: process.platform === "win32",
    })
  } catch (err) {
    result = null
  }

  if (!result || result.error || result.status !== 0) {
    try {
      const bunArgs = ["run", adapter.cliPath, "search", ...adapter.buildArgs(query, location), "--format", "json"]
      result = spawnSync("bun", bunArgs, {
        cwd: process.cwd(),
        timeout: 25_000,
        encoding: "utf-8",
        shell: process.platform === "win32",
      })
    } catch {
      return { results: [], failed: true }
    }
  }

  if (!result || result.error || result.status !== 0 || !result.stdout) return { results: [], failed: true }
  try {
    const parsed = JSON.parse(result.stdout)
    return { results: (parsed?.results ?? []) as Record<string, unknown>[], failed: false }
  } catch {
    return { results: [], failed: true }
  }
}

// Adaptadores Suportados (Tiers 0 e 1)
const linkedinAdapter: SourceAdapter = {
  name: "linkedin",
  tier: "tier1_aggregator",
  cliPath: ".agents/skills/linkedin-search/cli/src/cli.ts",
  buildArgs: (q, l) => ["-q", q, "-l", l || "Remote", "--jobage", "30"],
  normalize: (raw, source, tier) => {
    if (!raw.id || !raw.url) return null
    const title = String(raw.title || "(sem título)")
    const company = String(raw.company || "Empresa não informada")
    const url = String(raw.url)
    const description = String(raw.description || "")
    return {
      id: `${source}_${raw.id}`,
      externalId: String(raw.id),
      title,
      company,
      location: String(raw.location || "Remote"),
      url,
      description,
      date: raw.date ? String(raw.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      tier,
      status: "discovered",
      fit: "unrated",
      score: null,
      urlHash: generateUrlHash(url),
      contentHash: generateContentHash(title, company, description),
    }
  },
}

const freehireAdapter: SourceAdapter = {
  name: "freehire",
  tier: "tier1_aggregator",
  cliPath: ".agents/skills/freehire-search/cli/src/cli.ts",
  buildArgs: (q) => ["-q", q, "--limit", "15"],
  normalize: (raw, source, tier) => {
    if (!raw.id || !raw.url) return null
    const title = String(raw.title || "(sem título)")
    const company = String(raw.company || "Empresa não informada")
    const url = String(raw.url)
    const description = String(raw.description || "")
    return {
      id: `${source}_${raw.id}`,
      externalId: String(raw.id),
      title,
      company,
      location: String(raw.location || "Remoto"),
      url,
      description,
      date: raw.date ? String(raw.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      tier,
      status: "discovered",
      fit: "unrated",
      score: null,
      urlHash: generateUrlHash(url),
      contentHash: generateContentHash(title, company, description),
    }
  },
}

const indeedbrAdapter: SourceAdapter = {
  name: "indeed-br",
  tier: "tier1_aggregator",
  cliPath: ".agents/skills/indeed-br-search/cli/src/cli.ts",
  buildArgs: (q, l) => ["-q", q, "-l", l || "Brasil", "--limit", "15"],
  normalize: (raw, source, tier) => {
    if (!raw.id || !raw.url) return null
    const title = String(raw.title || "(sem título)")
    const company = String(raw.company || "Empresa não informada")
    const url = String(raw.url)
    const description = String(raw.description || "")
    return {
      id: `${source}_${raw.id}`,
      externalId: String(raw.id),
      title,
      company,
      location: String(raw.location || "Brasil"),
      url,
      description,
      date: raw.date ? String(raw.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      tier,
      status: "discovered",
      fit: "unrated",
      score: null,
      urlHash: generateUrlHash(url),
      contentHash: generateContentHash(title, company, description),
    }
  },
}

const jobindexAdapter: SourceAdapter = {
  name: "jobindex",
  tier: "tier1_aggregator",
  cliPath: ".agents/skills/jobindex-search/cli/src/cli.ts",
  buildArgs: (q, l) => ["-q", l ? `${q} ${l}` : q, "--jobage", "30"],
  normalize: (raw, source, tier) => {
    if (!raw.id || !raw.url) return null
    const title = String(raw.title || "(sem título)")
    const company = String(raw.company || "Empresa não informada")
    const url = String(raw.url)
    const description = String(raw.description || "")
    return {
      id: `${source}_${raw.id}`,
      externalId: String(raw.id),
      title,
      company,
      location: String(raw.location || "Dinamarca"),
      url,
      description,
      date: raw.date ? String(raw.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      source,
      tier,
      status: "discovered",
      fit: "unrated",
      score: null,
      urlHash: generateUrlHash(url),
      contentHash: generateContentHash(title, company, description),
    }
  },
}

const ADAPTERS: SourceAdapter[] = [linkedinAdapter, freehireAdapter, indeedbrAdapter, jobindexAdapter]

import { deduplicate } from "../canonical/deduplication"
import type { CanonicalJob } from "../types/canonical-job"

function discoveredToCanonical(job: DiscoveredJob): CanonicalJob {
  return {
    id: job.id,
    source: job.source,
    sourceJobId: job.externalId,
    sourceUrl: job.url,
    canonicalUrl: job.url,
    company: { name: job.company },
    title: job.title,
    normalizedTitle: job.title,
    descriptionRaw: job.description,
    locations: [{ rawLocation: job.location, isRemote: job.location.toLowerCase().includes("remot") }],
    requirements: { skills: [] },
    discoveredAt: new Date().toISOString(),
    fingerprints: {
      urlHash: job.urlHash,
      contentHash: job.contentHash,
    },
    provenance: [
      {
        source: job.source,
        sourceJobId: job.externalId,
        sourceUrl: job.url,
        discoveredAt: new Date().toISOString(),
      },
    ],
  }
}

export async function runMultiSourceDiscovery(query: string, location: string) {
  const diagnostics: PortalDiagnostic[] = []
  const allJobs: DiscoveredJob[] = []
  const canonicalStore: CanonicalJob[] = []

  for (const adapter of ADAPTERS) {
    if (!isAdapterEnabled(adapter)) {
      diagnostics.push({ portal: adapter.name, tier: adapter.tier, enabled: false, failed: false, returned: 0 })
      continue
    }

    const { results, failed } = runAdapterCli(adapter, query, location)
    let returned = 0

    for (const raw of results) {
      const job = adapter.normalize(raw, adapter.name, adapter.tier)
      if (!job) continue

      const canonicalRep = discoveredToCanonical(job)
      const duplicate = deduplicate(canonicalRep, canonicalStore)
      if (duplicate) {
        continue
      }

      canonicalStore.push(canonicalRep)
      allJobs.push(job)
      returned++
    }

    diagnostics.push({ portal: adapter.name, tier: adapter.tier, enabled: true, failed, returned })
  }

  // Persistência em SQLite com auditoria de estado inicial
  try {
    const db = getDb()
    const stmtInsertJob = db.prepare(`
      INSERT INTO jobs (id, external_id, source, source_url, company, title, location, description, published_at, content_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        company = excluded.company,
        location = excluded.location,
        updated_at = datetime('now')
    `)

    const stmtHistory = db.prepare(`
      INSERT INTO job_status_history (id, job_id, from_status, to_status, actor, notes)
      VALUES (?, ?, NULL, 'discovered', 'agent', ?)
    `)

    for (const job of allJobs) {
      stmtInsertJob.run(
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

      // Inserir registro inicial de auditoria
      try {
        stmtHistory.run(`hist_${crypto.randomUUID()}`, job.id, `Vaga descoberta via ${job.source} (Tier: ${job.tier})`)
      } catch {}
    }
  } catch (err) {
    console.error("Erro ao persistir vagas descobertas no SQLite:", err)
  }

  return { results: allJobs, sourceDiagnostics: diagnostics }
}
