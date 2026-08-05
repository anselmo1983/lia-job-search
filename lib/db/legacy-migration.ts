import fs from "node:fs"
import { promises as fsPromises } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { getDb } from "@/lib/db"
import { dataPath } from "@/lib/runtime/data-directory"

export interface MigrationResult {
  profilesImported: number
  resumesImported: number
  resumesDuplicates: number
  jobsImported: number
  jobsDuplicates: number
  legacyArchived: boolean
}

export async function runLegacyMigration(): Promise<MigrationResult> {
  const db = getDb()

  const result: MigrationResult = {
    profilesImported: 0,
    resumesImported: 0,
    resumesDuplicates: 0,
    jobsImported: 0,
    jobsDuplicates: 0,
    legacyArchived: false,
  }

  // 1. Garantir que exista um usuário primário para vinculo de Foreign Key
  let primaryUser = db.prepare("SELECT id, email FROM user ORDER BY createdAt ASC LIMIT 1").get() as
    | { id: string; email: string }
    | undefined

  if (!primaryUser) {
    const userId = crypto.randomUUID()
    const now = Date.now()
    const defaultEmail = process.env.LJS_AUTH_ALLOWED_EMAILS?.split(",")[0]?.trim() || "anselmo@lia.local"
    db.prepare(
      `INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(userId, "Anselmo Farias", defaultEmail, 1, now, now)
    primaryUser = { id: userId, email: defaultEmail }
  }

  const legacyDir = dataPath("legacy")
  if (!fs.existsSync(legacyDir)) {
    fs.mkdirSync(legacyDir, { recursive: true })
  }

  // 2. Migração de Perfil (profile.json / Markdown)
  const profileJsonPath = dataPath("profile", "profile.json")
  const mdProfilePath = path.join(process.cwd(), ".claude/skills/job-application-assistant/01-candidate-profile.md")

  let profileData: any = null
  let profileRawText = ""

  if (fs.existsSync(profileJsonPath)) {
    try {
      const content = await fsPromises.readFile(profileJsonPath, "utf8")
      profileData = JSON.parse(content)
      profileRawText = content
    } catch {}
  }

  if (!profileData && fs.existsSync(mdProfilePath)) {
    try {
      profileRawText = await fsPromises.readFile(mdProfilePath, "utf8")
      profileData = { summary: profileRawText }
    } catch {}
  }

  if (profileData) {
    const existingProfile = db.prepare("SELECT id FROM profile WHERE user_id = ?").get(primaryUser.id)
    const fullName = profileData.full_name || profileData.name || "Anselmo Farias"
    const email = profileData.email || primaryUser.email
    const phone = profileData.phone || profileData.telefone || null
    const location = profileData.location || profileData.localizacao || null
    const headline = profileData.headline || profileData.titulo || null
    const summary = profileData.summary || profileRawText
    const linkedin = profileData.linkedin_url || profileData.linkedin || null
    const github = profileData.github_url || profileData.github || null
    const structuredJson = JSON.stringify(profileData)

    if (existingProfile) {
      db.prepare(`
        UPDATE profile 
        SET full_name = ?, email = ?, phone = ?, location = ?, headline = ?, summary = ?, linkedin_url = ?, github_url = ?, structured_json = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(fullName, email, phone, location, headline, summary, linkedin, github, structuredJson, primaryUser.id)
    } else {
      db.prepare(`
        INSERT INTO profile (id, user_id, full_name, email, phone, location, headline, summary, linkedin_url, github_url, structured_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), primaryUser.id, fullName, email, phone, location, headline, summary, linkedin, github, structuredJson)
    }
    result.profilesImported = 1

    // Arquivar profile.json se existir
    if (fs.existsSync(profileJsonPath)) {
      try {
        await fsPromises.copyFile(profileJsonPath, path.join(legacyDir, "profile.json"))
      } catch {}
    }
  }

  // 3. Migração de Currículos (documents/ cv/*.pdf)
  const candidateDocsDirs = [
    dataPath("documents"),
    path.join(process.cwd(), "documents", "cv"),
    path.join(process.cwd(), "cv"),
  ]

  const documentsPrivateDir = dataPath("documents")
  if (!fs.existsSync(documentsPrivateDir)) {
    fs.mkdirSync(documentsPrivateDir, { recursive: true, mode: 0o700 })
  }

  for (const docDir of candidateDocsDirs) {
    if (!fs.existsSync(docDir)) continue
    const files = await fsPromises.readdir(docDir)
    for (const file of files) {
      if (!file.toLowerCase().endsWith(".pdf")) continue
      const filePath = path.join(docDir, file)
      const stat = await fsPromises.stat(filePath)
      if (!stat.isFile()) continue

      const fileBuffer = await fsPromises.readFile(filePath)
      const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex")

      const existingResume = db.prepare("SELECT id FROM resumes WHERE sha256 = ?").get(hash)
      if (existingResume) {
        result.resumesDuplicates++
        continue
      }

      const storageId = crypto.randomUUID()
      const storageFilename = `${storageId}.pdf`
      const destPath = path.join(documentsPrivateDir, storageFilename)

      await fsPromises.writeFile(destPath, fileBuffer, { mode: 0o600 })

      // Define o primeiro currículo importado como ativo se nenhum outro estiver ativo
      const activeCount = db.prepare("SELECT COUNT(*) as count FROM resumes WHERE user_id = ? AND is_active = 1").get(primaryUser.id) as { count: number }
      const isActive = activeCount.count === 0 ? 1 : 0

      db.prepare(`
        INSERT INTO resumes (id, user_id, original_filename, storage_filename, mime_type, size_bytes, sha256, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), primaryUser.id, file, storageFilename, "application/pdf", stat.size, hash, isActive)

      result.resumesImported++

      // Arquivar original
      try {
        const legacyCvDir = path.join(legacyDir, "cv")
        if (!fs.existsSync(legacyCvDir)) fs.mkdirSync(legacyCvDir, { recursive: true })
        await fsPromises.copyFile(filePath, path.join(legacyCvDir, file))
      } catch {}
    }
  }

  // 4. Migração de Vagas (seen_jobs.json)
  const seenJobsPath = dataPath("job_scraper", "seen_jobs.json")
  if (fs.existsSync(seenJobsPath)) {
    try {
      const content = await fsPromises.readFile(seenJobsPath, "utf8")
      const parsed = JSON.parse(content)
      let jobsList: any[] = []
      if (Array.isArray(parsed)) jobsList = parsed
      else if (parsed.jobs && Array.isArray(parsed.jobs)) jobsList = parsed.jobs
      else if (parsed.seen && typeof parsed.seen === "object") jobsList = Object.values(parsed.seen)

      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO jobs (id, external_id, source, source_url, company, title, location, work_mode, description, salary_text, published_at, content_hash, status, fit, score, strengths, gaps, reasoning)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const rawJob of jobsList) {
        const url = rawJob.url || rawJob.source_url || rawJob.link || ""
        if (!url) continue
        const company = rawJob.company || "Desconhecida"
        const title = rawJob.title || "Vaga Sem Título"
        const contentHash = crypto.createHash("sha256").update(`${company}:${title}:${url}`).digest("hex")

        const existing = db.prepare("SELECT id FROM jobs WHERE source_url = ? OR content_hash = ?").get(url, contentHash)
        if (existing) {
          result.jobsDuplicates++
          continue
        }

        insertStmt.run(
          rawJob.id || crypto.randomUUID(),
          rawJob.external_id || null,
          rawJob.source || "legacy_import",
          url,
          company,
          title,
          rawJob.location || null,
          rawJob.work_mode || null,
          rawJob.description || null,
          rawJob.salary || rawJob.salary_text || null,
          rawJob.date || rawJob.published_at || null,
          contentHash,
          rawJob.status || "discovered",
          rawJob.fit || "unrated",
          rawJob.score || null,
          Array.isArray(rawJob.strengths) ? JSON.stringify(rawJob.strengths) : rawJob.strengths || null,
          Array.isArray(rawJob.gaps) ? JSON.stringify(rawJob.gaps) : rawJob.gaps || null,
          rawJob.reasoning || null
        )
        result.jobsImported++
      }

      await fsPromises.copyFile(seenJobsPath, path.join(legacyDir, "seen_jobs.json"))
      result.legacyArchived = true
    } catch (err) {
      console.error("[Legacy Migration] Erro ao migrar seen_jobs.json:", err)
    }
  }

  return result
}
