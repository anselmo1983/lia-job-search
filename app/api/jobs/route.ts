import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getDb } from "@/lib/db"
import { requireSession } from "@/lib/auth/server"

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

export async function GET() {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const db = getDb()
    const rows = db.prepare("SELECT * FROM jobs ORDER BY discovered_at DESC").all() as any[]

    const jobs = rows.map((r) => ({
      id: r.id,
      external_id: r.external_id,
      source: r.source,
      url: r.source_url,
      company: r.company,
      title: r.title,
      location: r.location,
      work_mode: r.work_mode,
      description: r.description,
      salary: r.salary_text,
      status: r.status,
      fit: r.fit,
      score: r.score,
      strengths: r.strengths ? JSON.parse(r.strengths) : [],
      gaps: r.gaps ? JSON.parse(r.gaps) : [],
      reasoning: r.reasoning,
      date: r.published_at || r.discovered_at,
    }))

    return NextResponse.json({ jobs, total: jobs.length })
  } catch (error) {
    return NextResponse.json({ error: "Falha ao consultar vagas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const db = getDb()

    if (body.action === "add") {
      const incomingUrl = typeof body.url === "string" ? canonicalJobUrl(body.url) : ""
      const company = body.company || "Desconhecida"
      const title = body.title || "Vaga Sem Título"
      const contentHash = crypto.createHash("sha256").update(`${company}:${title}:${incomingUrl}`).digest("hex")

      if (incomingUrl) {
        const duplicate = db.prepare("SELECT * FROM jobs WHERE source_url = ? OR content_hash = ?").get(incomingUrl, contentHash) as any
        if (duplicate) {
          return NextResponse.json({
            success: true,
            duplicate: true,
            job: duplicate,
          })
        }
      }

      const id = body.id || crypto.randomUUID()
      db.prepare(`
        INSERT INTO jobs (id, external_id, source, source_url, company, title, location, work_mode, description, salary_text, published_at, content_hash, status, fit, score, strengths, gaps, reasoning)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.external_id || null,
        body.source || "manual",
        incomingUrl || body.url || "",
        company,
        title,
        body.location || null,
        body.work_mode || null,
        body.description || null,
        body.salary || body.salary_text || null,
        body.date || new Date().toISOString(),
        contentHash,
        "discovered",
        "unrated",
        null,
        null,
        null,
        null
      )

      return NextResponse.json({ success: true, duplicate: false, id })
    }

    if (body.action === "bulk_add" && Array.isArray(body.jobs)) {
      const insertStmt = db.prepare(`
        INSERT INTO jobs (id, external_id, source, source_url, company, title, location, work_mode, description, salary_text, published_at, content_hash, status, fit, score, strengths, gaps, reasoning)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const checkStmt = db.prepare("SELECT id FROM jobs WHERE source_url = ? OR content_hash = ?")

      const insertedIds: string[] = []
      let duplicateCount = 0

      const transaction = db.transaction((jobList: any[]) => {
        for (const job of jobList) {
          const incomingUrl = typeof job.url === "string" ? canonicalJobUrl(job.url) : ""
          const company = job.company || "Desconhecida"
          const title = job.title || "Vaga Sem Título"
          const contentHash = crypto.createHash("sha256").update(`${company}:${title}:${incomingUrl}`).digest("hex")

          if (incomingUrl) {
            const duplicate = checkStmt.get(incomingUrl, contentHash)
            if (duplicate) {
              duplicateCount++
              continue
            }
          }

          const id = job.id || crypto.randomUUID()
          insertStmt.run(
            id,
            job.external_id || null,
            job.source || "manual",
            incomingUrl || job.url || "",
            company,
            title,
            job.location || null,
            job.work_mode || null,
            job.description || null,
            job.salary || job.salary_text || null,
            job.date || new Date().toISOString(),
            contentHash,
            "discovered",
            "unrated",
            null,
            null,
            null,
            null
          )
          insertedIds.push(id)
        }
      })

      transaction(body.jobs)
      return NextResponse.json({ success: true, insertedCount: insertedIds.length, duplicateCount, ids: insertedIds })
    }

    if (body.action === "update") {
      const { id, updates } = body
      if (!id || !updates) return NextResponse.json({ error: "ID e updates são obrigatórios" }, { status: 400 })

      const fields: string[] = []
      const values: any[] = []

      if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status) }
      if (updates.fit !== undefined) { fields.push("fit = ?"); values.push(updates.fit) }
      if (updates.score !== undefined) { fields.push("score = ?"); values.push(updates.score) }
      if (updates.strengths !== undefined) { fields.push("strengths = ?"); values.push(JSON.stringify(updates.strengths)) }
      if (updates.gaps !== undefined) { fields.push("gaps = ?"); values.push(JSON.stringify(updates.gaps)) }
      if (updates.reasoning !== undefined) { fields.push("reasoning = ?"); values.push(updates.reasoning) }
      if (updates.title !== undefined) { fields.push("title = ?"); values.push(updates.title) }
      if (updates.company !== undefined) { fields.push("company = ?"); values.push(updates.company) }

      fields.push("updated_at = datetime('now')")
      values.push(id)

      if (fields.length > 1) {
        db.prepare(`UPDATE jobs SET ${fields.join(", ")} WHERE id = ?`).run(...values)
      }

      return NextResponse.json({ success: true })
    }

    if (body.action === "delete") {
      db.prepare("DELETE FROM jobs WHERE id = ?").run(body.id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
