import "server-only"

import { promises as fs } from "node:fs"
import path from "node:path"

const root = process.cwd()

export type Application = {
  date: string
  company: string
  sector: string
  role: string
  roleType: string
  channel: string
  status: string
  contactPerson: string
  fitRating: string
  notes: string
  cvFile: string
  coverLetterFile: string
  source: string
}

export type Job = {
  key: string
  title: string
  company: string
  location: string
  url: string
  status: string
  fit: string
  score: number | null
  deadline: string
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === "," && !quoted) {
      row.push(field)
      field = ""
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index += 1
      row.push(field)
      if (row.some(Boolean)) rows.push(row)
      row = []
      field = ""
    } else {
      field += character
    }
  }

  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

export async function getApplications(): Promise<Application[]> {
  try {
    const content = await fs.readFile(path.join(root, "job_search_tracker.csv"), "utf8")
    const [header = [], ...rows] = parseCsv(content)
    const value = (row: string[], name: string) => row[header.indexOf(name)]?.trim() ?? ""
    return rows.map((row) => ({
      date: value(row, "date"),
      company: value(row, "company"),
      sector: value(row, "sector"),
      role: value(row, "role"),
      roleType: value(row, "role_type"),
      channel: value(row, "channel"),
      status: value(row, "status"),
      contactPerson: value(row, "contact_person"),
      fitRating: value(row, "fit_rating"),
      notes: value(row, "notes"),
      cvFile: value(row, "cv_file"),
      coverLetterFile: value(row, "cover_letter_file"),
      source: value(row, "source"),
    }))
  } catch {
    return []
  }
}

function normalizeJobs(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
  if (!data || typeof data !== "object") return []
  const record = data as Record<string, unknown>
  const nested = record.jobs ?? record.results
  if (Array.isArray(nested)) return normalizeJobs(nested)
  return Object.entries(record).flatMap(([key, value]) =>
    value && typeof value === "object" ? [{ key, ...(value as Record<string, unknown>) }] : [],
  )
}

export async function getJobs(): Promise<Job[]> {
  try {
    const content = await fs.readFile(path.join(root, "job_scraper", "seen_jobs.json"), "utf8")
    return normalizeJobs(JSON.parse(content)).map((job, index) => ({
      key: String(job.key ?? job.id ?? index),
      title: String(job.title ?? job.role ?? "Untitled role"),
      company: String(job.company ?? "Unknown company"),
      location: String(job.location ?? "Not specified"),
      url: String(job.url ?? job.link ?? ""),
      status: String(job.status ?? "discovered"),
      fit: String(job.fit ?? job.fit_level ?? "unrated"),
      score: typeof job.rank_score === "number" ? job.rank_score : typeof job.score === "number" ? job.score : null,
      deadline: String(job.deadline ?? ""),
    }))
  } catch {
    return []
  }
}

async function countFiles(directory: string): Promise<number> {
  try {
    const entries = await fs.readdir(path.join(root, directory), { withFileTypes: true })
    const counts = await Promise.all(entries.map((entry) => entry.isDirectory() ? countFiles(path.join(directory, entry.name)) : 1))
    return counts.reduce((total, count) => total + count, 0)
  } catch {
    return 0
  }
}

export async function getWorkspaceFiles(directory: "cv" | "cover_letters") {
  try {
    const entries = await fs.readdir(path.join(root, directory), { withFileTypes: true })
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort()
  } catch {
    return []
  }
}

export async function getWorkspaceSummary() {
  const [applications, jobs, documents, cvs, letters] = await Promise.all([
    getApplications(),
    getJobs(),
    countFiles("documents"),
    countFiles("cv"),
    countFiles("cover_letters"),
  ])
  const open = applications.filter((application) => !["hired", "rejected", "no response", "withdrawn", "offer declined"].includes(application.status.toLowerCase()))
  return { applications, jobs, documents, cvs, letters, open }
}
