import { getDb } from "@/lib/db"

export type ApplicationStatus = "draft" | "pending_approval" | "approved" | "applied" | "rejected" | "failed"

export interface ApplicationRecord {
  id: string
  userId: string
  jobId: string
  resumeId?: string
  status: ApplicationStatus
  appliedAt?: string
  notes?: string
}

export interface ApplicationAuditEvent {
  id: string
  applicationId: string
  eventType: string
  fromStatus?: string
  toStatus?: string
  metadataJson?: string
  createdAt: string
}

function logAuditEvent(db: any, applicationId: string, eventType: string, fromStatus?: string, toStatus?: string, metadata?: Record<string, unknown>) {
  const eventId = crypto.randomUUID()
  const metadataJson = metadata ? JSON.stringify(metadata) : null

  db.prepare(`
    INSERT INTO application_events (id, application_id, event_type, from_status, to_status, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(eventId, applicationId, eventType, fromStatus || null, toStatus || null, metadataJson)

  return eventId
}

export function createApplicationDraft(userId: string, jobId: string, resumeId?: string, notes?: string): ApplicationRecord {
  const db = getDb()
  const appId = crypto.randomUUID()

  db.prepare(`
    INSERT INTO applications (id, user_id, job_id, resume_id, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'draft', ?, datetime('now'), datetime('now'))
    ON CONFLICT(user_id, job_id) DO UPDATE SET
      resume_id = excluded.resume_id,
      notes = excluded.notes,
      updated_at = datetime('now')
  `).run(appId, userId, jobId, resumeId || null, notes || null)

  const record = db.prepare("SELECT * FROM applications WHERE user_id = ? AND job_id = ?").get(userId, jobId) as any

  logAuditEvent(db, record.id, "DRAFT_CREATED", undefined, "draft", { resumeId, notes })

  return {
    id: record.id,
    userId: record.user_id,
    jobId: record.job_id,
    resumeId: record.resume_id,
    status: record.status,
    notes: record.notes,
  }
}

export function submitForApproval(applicationId: string): boolean {
  const db = getDb()
  const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(applicationId) as any
  if (!app || app.status !== "draft") return false

  db.prepare(`
    UPDATE applications SET status = 'pending_approval', updated_at = datetime('now') WHERE id = ?
  `).run(applicationId)

  logAuditEvent(db, applicationId, "APPROVAL_REQUESTED", "draft", "pending_approval")
  return true
}

export function confirmAndApply(applicationId: string, confirmedUserId: string): boolean {
  const db = getDb()
  const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(applicationId) as any
  if (!app) return false
  if (app.user_id !== confirmedUserId) return false
  if (app.status !== "pending_approval" && app.status !== "draft") return false

  const appliedAt = new Date().toISOString()

  db.prepare(`
    UPDATE applications SET status = 'applied', applied_at = ?, updated_at = datetime('now') WHERE id = ?
  `).run(appliedAt, applicationId)

  logAuditEvent(db, applicationId, "SUBMITTED", app.status, "applied", { confirmedBy: confirmedUserId, appliedAt })

  // Atualiza o status da vaga para 'applied' na tabela jobs
  db.prepare("UPDATE jobs SET status = 'applied', updated_at = datetime('now') WHERE id = ?").run(app.job_id)

  return true
}

export function getApplicationHistory(applicationId: string): ApplicationAuditEvent[] {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM application_events WHERE application_id = ? ORDER BY created_at ASC").all(applicationId) as any[]

  return rows.map((r) => ({
    id: r.id,
    applicationId: r.application_id,
    eventType: r.event_type,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    metadataJson: r.metadata_json,
    createdAt: r.created_at,
  }))
}
