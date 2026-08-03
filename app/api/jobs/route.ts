import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"

import { dataPath, writeAtomic } from "@/lib/runtime/data-directory"

const jobsPath = dataPath("job_scraper", "seen_jobs.json")

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

async function readJobs(): Promise<any[]> {
  try {
    const content = await fs.readFile(jobsPath, "utf8")
    const data = JSON.parse(content)
    if (Array.isArray(data)) return data
    if (data.jobs) return data.jobs
    if (data.seen) return Object.values(data.seen)
    return []
  } catch { return [] }
}

async function writeJobs(jobs: any[]) {
  await writeAtomic(jobsPath, jobs)
}

export async function GET() {
  const jobs = await readJobs()
  return NextResponse.json({ jobs, total: jobs.length })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const jobs = await readJobs()
    
    if (body.action === "add") {
      const incomingUrl =
        typeof body.url === "string"
          ? canonicalJobUrl(body.url)
          : ""

      if (incomingUrl) {
        const duplicate = jobs.find(
          (job: any) =>
            typeof job.url === "string" &&
            canonicalJobUrl(job.url) === incomingUrl,
        )

        if (duplicate) {
          return NextResponse.json({
            success: true,
            duplicate: true,
            job: duplicate,
            total: jobs.length,
          })
        }
      }

      const newJob = {
        id: body.id || crypto.randomUUID(),
        title: body.title,
        company: body.company,
        location: body.location || "",
        url: body.url || "",
        description: body.description || "",
        status: "discovered",
        fit: "unrated",
        score: null,
        strengths: [],
        gaps: [],
        reasoning: "",
        date: body.date || new Date().toISOString().split("T")[0],
        source: body.source || "manual",
      }
      jobs.push(newJob)
      await writeJobs(jobs)
      return NextResponse.json({ success: true, duplicate: false, job: newJob, total: jobs.length })
    }
    
    if (body.action === "update") {
      const index = jobs.findIndex((j: any) => j.id === body.id || j.key === body.id)
      if (index >= 0) {
        jobs[index] = { ...jobs[index], ...body.updates }
        await writeJobs(jobs)
        return NextResponse.json({ success: true, job: jobs[index] })
      }
      return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 })
    }
    
    if (body.action === "delete") {
      const filtered = jobs.filter((j: any) => j.id !== body.id && j.key !== body.id)
      await writeJobs(filtered)
      return NextResponse.json({ success: true, total: filtered.length })
    }
    
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
