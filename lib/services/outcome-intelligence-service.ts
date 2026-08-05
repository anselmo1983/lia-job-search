import { getDb } from "@/lib/db"

export interface FunnelMetrics {
  totalJobsDiscovered: number
  totalApplications: number
  totalApplied: number
  totalInterviews: number
  totalOffers: number
  totalRejected: number
  responseRatePct: number
  interviewConversionRatePct: number
  offerConversionRatePct: number
  averageResponseTimeDays: number
}

export function recordApplicationOutcome(
  applicationId: string,
  newStatus: "interview" | "rejected" | "offer",
  notes?: string
): boolean {
  const db = getDb()
  const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(applicationId) as any
  if (!app) return false

  const prevStatus = app.status

  db.prepare(`
    UPDATE applications
    SET status = ?, notes = COALESCE(?, notes), updated_at = datetime('now')
    WHERE id = ?
  `).run(newStatus, notes || null, applicationId)

  // Registra evento de alteração de desfecho
  const eventId = crypto.randomUUID()
  db.prepare(`
    INSERT INTO application_events (id, application_id, event_type, from_status, to_status, metadata_json, created_at)
    VALUES (?, ?, 'OUTCOME_UPDATED', ?, ?, ?, datetime('now'))
  `).run(eventId, applicationId, prevStatus, newStatus, JSON.stringify({ notes }))

  // Atualiza vaga correspondente se virar proposta ou entrevista
  if (newStatus === "interview" || newStatus === "offer") {
    db.prepare("UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, app.job_id)
  }

  return true
}

export function computeFunnelAnalytics(userId: string): FunnelMetrics {
  const db = getDb()

  const totalJobs = (db.prepare("SELECT COUNT(*) as cnt FROM jobs").get() as any)?.cnt || 0

  const apps = db.prepare("SELECT * FROM applications WHERE user_id = ?").all(userId) as any[]

  const totalApplications = apps.length
  const totalApplied = apps.filter((a) => a.status === "applied" || a.status === "interview" || a.status === "offer" || a.status === "rejected").length
  const totalInterviews = apps.filter((a) => a.status === "interview" || a.status === "offer").length
  const totalOffers = apps.filter((a) => a.status === "offer").length
  const totalRejected = apps.filter((a) => a.status === "rejected").length

  const responsesCount = totalInterviews + totalOffers + totalRejected
  const responseRatePct = totalApplied > 0 ? Math.round((responsesCount / totalApplied) * 100) : 0
  const interviewConversionRatePct = totalApplied > 0 ? Math.round((totalInterviews / totalApplied) * 100) : 0
  const offerConversionRatePct = totalInterviews > 0 ? Math.round((totalOffers / totalInterviews) * 100) : 0

  // Cálculo de tempo médio de resposta
  let totalDaysSum = 0
  let measuredCount = 0

  for (const app of apps) {
    if (app.applied_at) {
      const firstResponse = db.prepare(`
        SELECT created_at FROM application_events
        WHERE application_id = ? AND event_type = 'OUTCOME_UPDATED'
        ORDER BY created_at ASC LIMIT 1
      `).get(app.id) as any

      if (firstResponse?.created_at) {
        const appliedDate = new Date(app.applied_at).getTime()
        const responseDate = new Date(firstResponse.created_at).getTime()
        const diffDays = Math.max(0, (responseDate - appliedDate) / (1000 * 60 * 60 * 24))
        totalDaysSum += diffDays
        measuredCount++
      }
    }
  }

  const averageResponseTimeDays = measuredCount > 0 ? Number((totalDaysSum / measuredCount).toFixed(1)) : 0

  return {
    totalJobsDiscovered: totalJobs,
    totalApplications,
    totalApplied,
    totalInterviews,
    totalOffers,
    totalRejected,
    responseRatePct,
    interviewConversionRatePct,
    offerConversionRatePct,
    averageResponseTimeDays,
  }
}
