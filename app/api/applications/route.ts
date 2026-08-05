import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getDb } from "@/lib/db"
import { requireSession, getServerSession } from "@/lib/auth/server"

export async function GET() {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const session = await getServerSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 })

    const db = getDb()
    const applications = db.prepare(`
      SELECT a.*, j.title as job_title, j.company as job_company, r.original_filename as resume_name
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      LEFT JOIN resumes r ON a.resume_id = r.id
      WHERE a.user_id = ? AND a.deleted_at IS NULL
      ORDER BY a.created_at DESC
    `).all(session.user.id)

    return NextResponse.json({ applications })
  } catch (error) {
    return NextResponse.json({ error: "Falha ao consultar candidaturas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const session = await getServerSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 })

    const body = await request.json()
    const { job_id, resume_id, status = "draft", notes, source } = body

    if (!job_id) return NextResponse.json({ error: "job_id é obrigatório" }, { status: 400 })

    const db = getDb()
    const existing = db.prepare("SELECT id FROM applications WHERE user_id = ? AND job_id = ? AND deleted_at IS NULL").get(session.user.id, job_id)

    if (existing) {
      return NextResponse.json({ error: "Já existe uma candidatura cadastrada para esta vaga", id: (existing as any).id }, { status: 409 })
    }

    const id = crypto.randomUUID()
    const eventId = crypto.randomUUID()

    db.transaction(() => {
      db.prepare(`
        INSERT INTO applications (id, user_id, job_id, resume_id, status, source, notes, applied_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, session.user.id, job_id, resume_id || null, status, source || "manual", notes || null, status === "applied" ? new Date().toISOString() : null)

      db.prepare(`
        INSERT INTO application_events (id, application_id, event_type, from_status, to_status, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(eventId, id, "CREATED", null, status, JSON.stringify({ created_by: session.user.id, source }))
    })()

    return NextResponse.json({ success: true, id })
  } catch (error) {
    return NextResponse.json({ error: "Falha ao criar candidatura" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const session = await getServerSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 })

    const { id, status, notes, resume_id } = await request.json()
    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

    const db = getDb()
    const current = db.prepare("SELECT * FROM applications WHERE id = ? AND user_id = ? AND deleted_at IS NULL").get(id, session.user.id) as any

    if (!current) return NextResponse.json({ error: "Candidatura não encontrada" }, { status: 404 })

    db.transaction(() => {
      const updates: string[] = []
      const values: any[] = []

      if (status && status !== current.status) {
        updates.push("status = ?")
        values.push(status)
        if (status === "applied" && !current.applied_at) {
          updates.push("applied_at = datetime('now')")
        }

        // Registrar evento auditável de transição de status
        db.prepare(`
          INSERT INTO application_events (id, application_id, event_type, from_status, to_status, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), id, "STATUS_CHANGE", current.status, status, JSON.stringify({ updated_by: session.user.id }))
      }

      if (notes !== undefined) {
        updates.push("notes = ?")
        values.push(notes)
      }

      if (resume_id !== undefined) {
        updates.push("resume_id = ?")
        values.push(resume_id)
      }

      updates.push("updated_at = datetime('now')")
      values.push(id)
      values.push(session.user.id)

      db.prepare(`UPDATE applications SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values)
    })()

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Falha ao atualizar candidatura" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const session = await getServerSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

    const db = getDb()
    db.transaction(() => {
      db.prepare("UPDATE applications SET deleted_at = datetime('now') WHERE id = ? AND user_id = ?").run(id, session.user.id)
      db.prepare(`
        INSERT INTO application_events (id, application_id, event_type, from_status, to_status, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), id, "DELETED", null, "deleted", JSON.stringify({ deleted_by: session.user.id }))
    })()

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Falha ao remover candidatura" }, { status: 500 })
  }
}
