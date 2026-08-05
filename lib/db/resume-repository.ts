import { getDb } from "@/lib/db"
import {
  ResumeDocument,
  ResumeDocumentSchema,
  ResumeVersion,
  ResumeVersionSchema,
  JsonPatchOperation,
} from "@/lib/db/resume-schema"

export function createCompiledResume(
  userId: string,
  doc: ResumeDocument,
  author = "user",
  changeSummary = "Initial compile"
): { resume: ResumeDocument; version: ResumeVersion } {
  const db = getDb()

  const validDoc = ResumeDocumentSchema.parse(doc)
  const versionId = crypto.randomUUID()
  const versionNumber = 1

  const initialVersion: ResumeVersion = {
    id: versionId,
    resumeId: validDoc.id,
    versionNumber,
    patch: [],
    snapshot: validDoc,
    author,
    changeSummary,
    createdAt: new Date().toISOString(),
  }

  const stmtResume = db.prepare(`
    INSERT INTO compiled_resumes (id, user_id, job_id, title, current_version, document_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `)

  const stmtVersion = db.prepare(`
    INSERT INTO compiled_resume_versions (id, resume_id, version_number, patch_json, snapshot_json, author, change_summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    stmtResume.run(
      validDoc.id,
      userId,
      validDoc.jobId || null,
      validDoc.title,
      versionNumber,
      JSON.stringify(validDoc)
    )
    stmtVersion.run(
      initialVersion.id,
      initialVersion.resumeId,
      initialVersion.versionNumber,
      JSON.stringify(initialVersion.patch),
      JSON.stringify(initialVersion.snapshot),
      initialVersion.author,
      initialVersion.changeSummary,
      initialVersion.createdAt
    )
  })

  transaction()

  return { resume: validDoc, version: initialVersion }
}

export function getCompiledResume(id: string): ResumeDocument | null {
  const db = getDb()
  const row = db.prepare("SELECT document_json FROM compiled_resumes WHERE id = ?").get(id) as
    | { document_json: string }
    | undefined
  if (!row) return null
  return ResumeDocumentSchema.parse(JSON.parse(row.document_json))
}

export function listCompiledResumes(userId: string): Array<{
  id: string
  title: string
  jobId?: string
  currentVersion: number
  updatedAt: string
}> {
  const db = getDb()
  const rows = db
    .prepare(
      "SELECT id, title, job_id as jobId, current_version as currentVersion, updated_at as updatedAt FROM compiled_resumes WHERE user_id = ? ORDER BY updated_at DESC"
    )
    .all(userId) as Array<{
    id: string
    title: string
    jobId: string | null
    currentVersion: number
    updatedAt: string
  }>

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    jobId: r.jobId || undefined,
    currentVersion: r.currentVersion,
    updatedAt: r.updatedAt,
  }))
}

export function updateCompiledResumeWithPatch(
  id: string,
  patch: JsonPatchOperation[],
  newDoc: ResumeDocument,
  author = "user",
  changeSummary = "Updated resume"
): ResumeVersion | null {
  const db = getDb()
  const current = db.prepare("SELECT current_version FROM compiled_resumes WHERE id = ?").get(id) as
    | { current_version: number }
    | undefined
  if (!current) return null

  const validDoc = ResumeDocumentSchema.parse({
    ...newDoc,
    id,
    updatedAt: new Date().toISOString(),
  })

  const nextVersionNumber = current.current_version + 1
  const versionId = crypto.randomUUID()

  const newVersion: ResumeVersion = {
    id: versionId,
    resumeId: id,
    versionNumber: nextVersionNumber,
    patch,
    snapshot: validDoc,
    author,
    changeSummary,
    createdAt: new Date().toISOString(),
  }

  const stmtUpdateResume = db.prepare(`
    UPDATE compiled_resumes
    SET title = ?, current_version = ?, document_json = ?, updated_at = datetime('now')
    WHERE id = ?
  `)

  const stmtInsertVersion = db.prepare(`
    INSERT INTO compiled_resume_versions (id, resume_id, version_number, patch_json, snapshot_json, author, change_summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    stmtUpdateResume.run(validDoc.title, nextVersionNumber, JSON.stringify(validDoc), id)
    stmtInsertVersion.run(
      newVersion.id,
      newVersion.resumeId,
      newVersion.versionNumber,
      JSON.stringify(newVersion.patch),
      JSON.stringify(newVersion.snapshot),
      newVersion.author,
      newVersion.changeSummary,
      newVersion.createdAt
    )
  })

  transaction()

  return newVersion
}

export function listResumeVersions(resumeId: string): ResumeVersion[] {
  const db = getDb()
  const rows = db
    .prepare(
      "SELECT id, resume_id, version_number, patch_json, snapshot_json, author, change_summary, created_at FROM compiled_resume_versions WHERE resume_id = ? ORDER BY version_number DESC"
    )
    .all(resumeId) as Array<{
    id: string
    resume_id: string
    version_number: number
    patch_json: string
    snapshot_json: string
    author: string
    change_summary: string
    created_at: string
  }>

  return rows.map((r) =>
    ResumeVersionSchema.parse({
      id: r.id,
      resumeId: r.resume_id,
      versionNumber: r.version_number,
      patch: JSON.parse(r.patch_json || "[]"),
      snapshot: JSON.parse(r.snapshot_json),
      author: r.author,
      changeSummary: r.change_summary,
      createdAt: r.created_at,
    })
  )
}

export function rollbackResumeToVersion(
  resumeId: string,
  targetVersionNumber: number,
  author = "user"
): ResumeVersion | null {
  const db = getDb()
  const targetRow = db
    .prepare(
      "SELECT snapshot_json FROM compiled_resume_versions WHERE resume_id = ? AND version_number = ?"
    )
    .get(resumeId, targetVersionNumber) as { snapshot_json: string } | undefined

  if (!targetRow) return null

  const restoredDoc = ResumeDocumentSchema.parse(JSON.parse(targetRow.snapshot_json))

  return updateCompiledResumeWithPatch(
    resumeId,
    [{ op: "replace", path: "", value: restoredDoc }],
    restoredDoc,
    author,
    `Rollback para versão ${targetVersionNumber}`
  )
}

export function deleteCompiledResume(id: string): boolean {
  const db = getDb()
  const result = db.prepare("DELETE FROM compiled_resumes WHERE id = ?").run(id)
  return result.changes > 0
}
