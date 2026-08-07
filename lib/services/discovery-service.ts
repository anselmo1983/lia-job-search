import { execFile } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { getDb } from "@/lib/db"
import type { CanonicalJob } from "../types/canonical-job"
import { normalizeJob } from "../canonical/normalizer"
import { deduplicate } from "../canonical/deduplication"
import { mergeJobProvenance } from "../canonical/fingerprint"

export type SourceTier = "tier0_ats" | "tier1_aggregator" | "tier2_scraper"

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
  normalize: (raw: Record<string, unknown>, source: string, tier: SourceTier) => CanonicalJob | null
}

export function canonicalJobUrl(input: string): string {
  if (!input) return ""
  try {
    const url = new URL(input.trim())
    url.hash = ""
    url.hostname = url.hostname.toLowerCase()

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

function executeCliAsync(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd: process.cwd(), timeout: 20_000, encoding: "utf-8" }, (error, stdout) => {
      if (error || !stdout) return reject(error || new Error("Sem saída"))
      resolve(stdout)
    })
  })
}

async function runAdapterCliAsync(adapter: SourceAdapter, query: string, location: string): Promise<{ adapter: SourceAdapter; results: Record<string, unknown>[]; failed: boolean }> {
  const tsxArgs = [adapter.cliPath, "search", ...adapter.buildArgs(query, location), "--format", "json"]

  try {
    const stdout = await executeCliAsync("npx", ["tsx", ...tsxArgs])
    const parsed = JSON.parse(stdout)
    return { adapter, results: (parsed?.results ?? []) as Record<string, unknown>[], failed: false }
  } catch {
    try {
      const bunArgs = ["run", adapter.cliPath, "search", ...adapter.buildArgs(query, location), "--format", "json"]
      const stdout = await executeCliAsync("bun", bunArgs)
      const parsed = JSON.parse(stdout)
      return { adapter, results: (parsed?.results ?? []) as Record<string, unknown>[], failed: false }
    } catch {
      return { adapter, results: [], failed: true }
    }
  }
}

// Adaptadores de Portais Suportados
const linkedinAdapter: SourceAdapter = {
  name: "linkedin",
  tier: "tier1_aggregator",
  cliPath: ".agents/skills/linkedin-search/cli/src/cli.ts",
  buildArgs: (q, l) => ["-q", q, "-l", l || "Remote", "--jobage", "30"],
  normalize: (raw, source, tier) => {
    if (!raw.id || !raw.url) return null
    return normalizeJob({
      id: `${source}_${raw.id}`,
      source,
      sourceJobId: String(raw.id),
      sourceUrl: String(raw.url),
      canonicalUrl: String(raw.url),
      companyName: String(raw.company || "Empresa não informada"),
      title: String(raw.title || "(sem título)"),
      descriptionRaw: String(raw.description || ""),
      locationRaw: String(raw.location || "Remote"),
      publishedAt: raw.date ? String(raw.date).slice(0, 10) : undefined,
      metadata: { tier },
    })
  },
}

const freehireAdapter: SourceAdapter = {
  name: "freehire",
  tier: "tier1_aggregator",
  cliPath: ".agents/skills/freehire-search/cli/src/cli.ts",
  buildArgs: (q) => ["-q", q, "--limit", "15"],
  normalize: (raw, source, tier) => {
    if (!raw.id || !raw.url) return null
    return normalizeJob({
      id: `${source}_${raw.id}`,
      source,
      sourceJobId: String(raw.id),
      sourceUrl: String(raw.url),
      canonicalUrl: String(raw.url),
      companyName: String(raw.company || "Empresa não informada"),
      title: String(raw.title || "(sem título)"),
      descriptionRaw: String(raw.description || ""),
      locationRaw: String(raw.location || "Remoto"),
      publishedAt: raw.date ? String(raw.date).slice(0, 10) : undefined,
      metadata: { tier },
    })
  },
}

const indeedbrAdapter: SourceAdapter = {
  name: "indeed-br",
  tier: "tier1_aggregator",
  cliPath: ".agents/skills/indeed-br-search/cli/src/cli.ts",
  buildArgs: (q, l) => ["-q", q, "-l", l || "Brasil", "--limit", "15"],
  normalize: (raw, source, tier) => {
    if (!raw.id || !raw.url) return null
    return normalizeJob({
      id: `${source}_${raw.id}`,
      source,
      sourceJobId: String(raw.id),
      sourceUrl: String(raw.url),
      canonicalUrl: String(raw.url),
      companyName: String(raw.company || "Empresa não informada"),
      title: String(raw.title || "(sem título)"),
      descriptionRaw: String(raw.description || ""),
      locationRaw: String(raw.location || "Brasil"),
      publishedAt: raw.date ? String(raw.date).slice(0, 10) : undefined,
      metadata: { tier },
    })
  },
}

const jobindexAdapter: SourceAdapter = {
  name: "jobindex",
  tier: "tier1_aggregator",
  cliPath: ".agents/skills/jobindex-search/cli/src/cli.ts",
  buildArgs: (q, l) => ["-q", l ? `${q} ${l}` : q, "--jobage", "30"],
  normalize: (raw, source, tier) => {
    if (!raw.id || !raw.url) return null
    return normalizeJob({
      id: `${source}_${raw.id}`,
      source,
      sourceJobId: String(raw.id),
      sourceUrl: String(raw.url),
      canonicalUrl: String(raw.url),
      companyName: String(raw.company || "Empresa não informada"),
      title: String(raw.title || "(sem título)"),
      descriptionRaw: String(raw.description || ""),
      locationRaw: String(raw.location || "Dinamarca"),
      publishedAt: raw.date ? String(raw.date).slice(0, 10) : undefined,
      metadata: { tier },
    })
  },
}

const jobnetAdapter: SourceAdapter = {
  name: "jobnet",
  tier: "tier1_aggregator",
  cliPath: ".agents/skills/jobnet-search/cli/src/cli.ts",
  buildArgs: (q) => ["-q", q, "--limit", "15"],
  normalize: (raw, source, tier) => {
    if (!raw.id || !raw.url) return null
    return normalizeJob({
      id: `${source}_${raw.id}`,
      source,
      sourceJobId: String(raw.id),
      sourceUrl: String(raw.url),
      canonicalUrl: String(raw.url),
      companyName: String(raw.company || "Empresa não informada"),
      title: String(raw.title || "(sem título)"),
      descriptionRaw: String(raw.description || ""),
      locationRaw: String(raw.location || "Denmark"),
      publishedAt: raw.date ? String(raw.date).slice(0, 10) : undefined,
      metadata: { tier },
    })
  },
}

const ADAPTERS: SourceAdapter[] = [linkedinAdapter, freehireAdapter, indeedbrAdapter, jobindexAdapter, jobnetAdapter]

export async function runMultiSourceDiscovery(query: string, location: string) {
  const diagnostics: PortalDiagnostic[] = []
  const canonicalJobs: CanonicalJob[] = []

  const enabledAdapters = ADAPTERS.filter((adapter) => {
    const enabled = isAdapterEnabled(adapter)
    if (!enabled) {
      diagnostics.push({ portal: adapter.name, tier: adapter.tier, enabled: false, failed: false, returned: 0 })
    }
    return enabled
  })

  // Execução Paralela Simultânea de todos os adaptadores
  const adapterPromises = enabledAdapters.map((adapter) => runAdapterCliAsync(adapter, query, location))
  const adapterResults = await Promise.all(adapterPromises)

  for (const { adapter, results, failed } of adapterResults) {
    let returned = 0

    for (const raw of results) {
      const job = adapter.normalize(raw, adapter.name, adapter.tier)
      if (!job) continue

      const duplicate = deduplicate(job, canonicalJobs)
      if (duplicate) {
        const idx = canonicalJobs.findIndex((j) => j.id === duplicate.id)
        if (idx !== -1) {
          canonicalJobs[idx] = mergeJobProvenance(canonicalJobs[idx], job)
        }
        continue
      }

      canonicalJobs.push(job)
      returned++
    }

    diagnostics.push({ portal: adapter.name, tier: adapter.tier, enabled: true, failed, returned })
  }

  // Persistência em Lote com Transação Atômica no SQLite
  try {
    const db = getDb()
    const stmtInsertJob = db.prepare(`
      INSERT INTO jobs (id, external_id, source, source_url, company, title, location, work_mode, description, published_at, content_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        company = excluded.company,
        location = excluded.location,
        work_mode = excluded.work_mode,
        updated_at = datetime('now')
    `)

    const stmtHistory = db.prepare(`
      INSERT INTO job_status_history (id, job_id, from_status, to_status, actor, notes)
      VALUES (?, ?, NULL, 'discovered', 'agent', ?)
    `)

    const transaction = db.transaction((jobs: CanonicalJob[]) => {
      for (const job of jobs) {
        const locStr = job.locations[0]?.rawLocation || [job.locations[0]?.city, job.locations[0]?.state, job.locations[0]?.country].filter(Boolean).join(", ") || ""
        const tier = (job.provenance[0]?.metadata as any)?.tier || "tier1_aggregator"
        const mode = job.workplaceType && job.workplaceType !== "unknown" ? job.workplaceType : null

        stmtInsertJob.run(
          job.id,
          job.sourceJobId || null,
          job.source,
          job.canonicalUrl || job.sourceUrl,
          job.company.name,
          job.title,
          locStr,
          mode,
          job.descriptionRaw,
          job.publishedAt || null,
          job.fingerprints.contentHash || null,
          "discovered"
        )

        try {
          stmtHistory.run(`hist_${crypto.randomUUID()}`, job.id, `Vaga descoberta via ${job.source} (Tier: ${tier})`)
        } catch {}
      }
    })

    transaction(canonicalJobs)
  } catch (err) {
    console.error("Erro ao persistir vagas descobertas no SQLite:", err)
  }

  return { results: canonicalJobs, sourceDiagnostics: diagnostics }
}
