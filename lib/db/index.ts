import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { dataPath } from "@/lib/runtime/data-directory"

const DB_PATH = dataPath("database", "lia.db")

function ensureDbDir(dbPath: string): void {
  try {
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch {}
}

export const dbPath = DB_PATH

let instance: Database.Database | null = null

export function getDb(): Database.Database {
  if (instance) return instance

  ensureDbDir(DB_PATH)
  const db = new Database(DB_PATH)
  db.pragma("journal_mode = WAL")
  db.pragma("busy_timeout = 5000")
  db.pragma("foreign_keys = ON")

  // Bootstrapping do schema unificado
  db.exec(`
    -- Better Auth tables
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      emailVerified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY NOT NULL,
      expiresAt INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      ipAddress TEXT,
      userAgent TEXT,
      userId TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY NOT NULL,
      accountId TEXT NOT NULL,
      providerId TEXT NOT NULL,
      userId TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
      accessToken TEXT,
      refreshToken TEXT,
      idToken TEXT,
      accessTokenExpiresAt INTEGER,
      refreshTokenExpiresAt INTEGER,
      scope TEXT,
      password TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY NOT NULL,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      createdAt INTEGER,
      updatedAt INTEGER
    );

    -- Domain tables (Fase 03 — Modelo SQL local)
    CREATE TABLE IF NOT EXISTS profile (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL UNIQUE REFERENCES user (id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      location TEXT,
      headline TEXT,
      summary TEXT,
      linkedin_url TEXT,
      github_url TEXT,
      structured_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
      original_filename TEXT NOT NULL,
      storage_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/pdf',
      size_bytes INTEGER NOT NULL,
      sha256 TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 0,
      extracted_text TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY NOT NULL,
      external_id TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      source_url TEXT NOT NULL,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      location TEXT,
      work_mode TEXT,
      description TEXT,
      salary_text TEXT,
      published_at TEXT,
      discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
      content_hash TEXT,
      status TEXT NOT NULL DEFAULT 'discovered',
      fit TEXT DEFAULT 'unrated',
      score REAL,
      strengths TEXT,
      gaps TEXT,
      reasoning TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
      resume_id TEXT REFERENCES resumes (id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      applied_at TEXT,
      source TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      UNIQUE(user_id, job_id)
    );

    CREATE TABLE IF NOT EXISTS application_events (
      id TEXT PRIMARY KEY NOT NULL,
      application_id TEXT NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_run (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
      job_id TEXT REFERENCES jobs (id) ON DELETE SET NULL,
      operation TEXT NOT NULL,
      provider TEXT,
      model TEXT,
      status TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      estimated_cost REAL DEFAULT 0.0,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      error_code TEXT
    );

    CREATE TABLE IF NOT EXISTS job_status_history (
      id TEXT PRIMARY KEY NOT NULL,
      job_id TEXT NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'user',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS compiled_resumes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
      job_id TEXT REFERENCES jobs (id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      current_version INTEGER NOT NULL DEFAULT 1,
      document_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS compiled_resume_versions (
      id TEXT PRIMARY KEY NOT NULL,
      resume_id TEXT NOT NULL REFERENCES compiled_resumes (id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      patch_json TEXT,
      snapshot_json TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'user',
      change_summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
      job_id TEXT REFERENCES jobs (id) ON DELETE SET NULL,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      interview_type TEXT NOT NULL DEFAULT 'technical',
      scheduled_at TEXT NOT NULL,
      location_or_link TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      notes TEXT,
      prep_guide_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_resumes_sha256 ON resumes(sha256);
    CREATE INDEX IF NOT EXISTS idx_jobs_source_url ON jobs(source_url);
    CREATE INDEX IF NOT EXISTS idx_applications_user_job ON applications(user_id, job_id);
    CREATE INDEX IF NOT EXISTS idx_events_application ON application_events(application_id);
    CREATE INDEX IF NOT EXISTS idx_job_status_history_job ON job_status_history(job_id);
    CREATE INDEX IF NOT EXISTS idx_compiled_resumes_user ON compiled_resumes(user_id);
    CREATE INDEX IF NOT EXISTS idx_compiled_resume_versions_resume ON compiled_resume_versions(resume_id, version_number);
    CREATE INDEX IF NOT EXISTS idx_interviews_user ON interviews(user_id);
  `)

  instance = db
  return instance
}


