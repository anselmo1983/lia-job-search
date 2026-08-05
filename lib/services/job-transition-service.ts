import crypto from "node:crypto"
import { getDb } from "@/lib/db"

export interface JobStatusTransition {
  jobId: string
  toStatus: string
  actor?: "user" | "agent"
  notes?: string
}

export interface TransitionHistoryItem {
  id: string
  jobId: string
  fromStatus: string | null
  toStatus: string
  actor: string
  notes: string | null
  createdAt: string
}

export function transitionJobStatus(
  jobId: string,
  toStatus: string,
  actor: "user" | "agent" = "user",
  notes?: string
): { success: boolean; fromStatus: string | null; toStatus: string } {
  const db = getDb()

  const currentJob = db.prepare("SELECT id, status FROM jobs WHERE id = ?").get(jobId) as
    | { id: string; status: string }
    | undefined

  if (!currentJob) {
    throw new Error(`Vaga não encontrada com o ID: ${jobId}`)
  }

  const fromStatus = currentJob.status

  if (fromStatus === toStatus) {
    return { success: true, fromStatus, toStatus }
  }

  const updateStmt = db.prepare(`
    UPDATE jobs
    SET status = ?, updated_at = datetime('now')
    WHERE id = ?
  `)

  const historyStmt = db.prepare(`
    INSERT INTO job_status_history (id, job_id, from_status, to_status, actor, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const historyId = `hist_${crypto.randomUUID()}`

  const transaction = db.transaction(() => {
    updateStmt.run(toStatus, jobId)
    historyStmt.run(historyId, jobId, fromStatus, toStatus, actor, notes || null)
  })

  transaction()

  return { success: true, fromStatus, toStatus }
}

export function transitionJobsInBulk(
  jobIds: string[],
  toStatus: string,
  actor: "user" | "agent" = "user",
  notes?: string
): { updatedCount: number } {
  let updatedCount = 0

  for (const id of jobIds) {
    try {
      const res = transitionJobStatus(id, toStatus, actor, notes || "Atualização em lote")
      if (res.success && res.fromStatus !== res.toStatus) {
        updatedCount++
      }
    } catch (err) {
      console.error(`Erro ao atualizar status da vaga ${id} em lote:`, err)
    }
  }

  return { updatedCount }
}

export function getJobTransitionHistory(jobId: string): TransitionHistoryItem[] {
  const db = getDb()
  const rows = db
    .prepare(
      `
      SELECT id, job_id as jobId, from_status as fromStatus, to_status as toStatus, actor, notes, created_at as createdAt
      FROM job_status_history
      WHERE job_id = ?
      ORDER BY created_at DESC
    `
    )
    .all(jobId) as TransitionHistoryItem[]

  return rows
}
