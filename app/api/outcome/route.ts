import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getDb } from "@/lib/db"
import { requireSession, getServerSession } from "@/lib/auth/server"

export async function POST(request: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized
  try {
    const session = await getServerSession()
    const userId = session?.user?.id || "local-user"

    const { company, role, status = "applied", notes, date } = await request.json()
    const db = getDb()

    // 1. Garantir que a vaga exista na tabela jobs
    let jobRow = db.prepare("SELECT id FROM jobs WHERE company = ? AND title = ?").get(company, role) as any
    let jobId = jobRow?.id

    if (!jobId) {
      jobId = crypto.randomUUID()
      const contentHash = crypto.createHash("sha256").update(`${company}:${role}:${Date.now()}`).digest("hex")
      db.prepare(`
        INSERT INTO jobs (id, source, source_url, company, title, content_hash, status)
        VALUES (?, 'manual', '', ?, ?, ?, 'applied')
      `).run(jobId, company, role, contentHash)
    }

    // 2. Inserir ou atualizar a candidatura no SQLite
    const appId = crypto.randomUUID()
    db.transaction(() => {
      db.prepare(`
        INSERT INTO applications (id, user_id, job_id, status, source, notes, applied_at)
        VALUES (?, ?, ?, ?, 'manual', ?, ?)
        ON CONFLICT(user_id, job_id) DO UPDATE SET
          status = excluded.status,
          notes = excluded.notes,
          updated_at = datetime('now')
      `).run(appId, userId, jobId, status, notes || null, date || new Date().toISOString())

      db.prepare(`
        INSERT INTO application_events (id, application_id, event_type, from_status, to_status, metadata_json)
        VALUES (?, ?, 'CREATED', NULL, ?, ?)
      `).run(crypto.randomUUID(), appId, status, JSON.stringify({ company, role, notes }))
    })()

    return NextResponse.json({ success: true, id: appId })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized
  try {
    const session = await getServerSession()
    const userId = session?.user?.id || "local-user"
    const db = getDb()

    const rows = db.prepare(`
      SELECT a.id, a.status, a.notes, a.created_at as date,
             j.company, j.title as role, j.fit as fit_rating
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.deleted_at IS NULL
      ORDER BY a.created_at DESC
    `).all() as any[]

    return NextResponse.json({ applications: rows })
  } catch {
    return NextResponse.json({ applications: [] })
  }
}
