import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { getDb } from "@/lib/db"
import { requireSession, getServerSession } from "@/lib/auth/server"
import { dataPath } from "@/lib/runtime/data-directory"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function GET(request: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const session = await getServerSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const resumeId = searchParams.get("id")
    const download = searchParams.get("download")

    const db = getDb()

    // Download seguro por ID autenticado
    if (resumeId && download === "true") {
      const resume = db.prepare("SELECT * FROM resumes WHERE id = ? AND user_id = ? AND deleted_at IS NULL").get(resumeId, session.user.id) as any
      if (!resume) return NextResponse.json({ error: "Currículo não encontrado" }, { status: 404 })

      const filePath = path.join(dataPath("documents"), resume.storage_filename)
      const fileBuffer = await fs.readFile(filePath)

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(resume.original_filename)}"`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
        },
      })
    }

    const resumes = db.prepare("SELECT id, original_filename, mime_type, size_bytes, sha256, is_active, created_at FROM resumes WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC").all(session.user.id)
    return NextResponse.json({ resumes })
  } catch (error) {
    return NextResponse.json({ error: "Falha ao listar currículos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const session = await getServerSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Arquivo excede o limite máximo de 10MB" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Validação de Magic Bytes (%PDF-)
    if (buffer.length < 4 || buffer.toString("utf8", 0, 4) !== "%PDF") {
      return NextResponse.json({ error: "Formato inválido: apenas arquivos PDF autênticos são aceitos" }, { status: 400 })
    }

    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex")
    const db = getDb()

    const existing = db.prepare("SELECT id FROM resumes WHERE sha256 = ? AND deleted_at IS NULL").get(sha256)
    if (existing) {
      return NextResponse.json({ error: "Este currículo já foi enviado anteriormente", duplicate: true }, { status: 409 })
    }

    const storageId = crypto.randomUUID()
    const storageFilename = `${storageId}.pdf`
    const docsDir = dataPath("documents")

    await fs.mkdir(docsDir, { recursive: true, mode: 0o700 })
    const destPath = path.join(docsDir, storageFilename)

    await fs.writeFile(destPath, buffer, { mode: 0o600 })

    const activeCount = db.prepare("SELECT COUNT(*) as count FROM resumes WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL").get(session.user.id) as { count: number }
    const isActive = activeCount.count === 0 ? 1 : 0

    const id = crypto.randomUUID()
    db.prepare(`
      INSERT INTO resumes (id, user_id, original_filename, storage_filename, mime_type, size_bytes, sha256, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, session.user.id, file.name, storageFilename, "application/pdf", file.size, sha256, isActive)

    return NextResponse.json({ success: true, id, filename: file.name, sha256 })
  } catch (error) {
    return NextResponse.json({ error: "Falha no upload do currículo" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const session = await getServerSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 })

    const { id, action } = await request.json()
    const db = getDb()

    if (action === "activate") {
      db.transaction(() => {
        db.prepare("UPDATE resumes SET is_active = 0 WHERE user_id = ?").run(session.user.id)
        db.prepare("UPDATE resumes SET is_active = 1, updated_at = datetime('now') WHERE id = ? AND user_id = ?").run(id, session.user.id)
      })()
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: "Falha ao atualizar currículo" }, { status: 500 })
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
    
    // Verifica se há candidaturas associadas
    const appsCount = db.prepare("SELECT COUNT(*) as count FROM applications WHERE resume_id = ? AND deleted_at IS NULL").get(id) as { count: number }
    if (appsCount.count > 0) {
      // Soft delete se houver vínculo com candidatura
      db.prepare("UPDATE resumes SET deleted_at = datetime('now') WHERE id = ? AND user_id = ?").run(id, session.user.id)
    } else {
      const resume = db.prepare("SELECT storage_filename FROM resumes WHERE id = ? AND user_id = ?").get(id, session.user.id) as any
      if (resume) {
        try {
          await fs.unlink(path.join(dataPath("documents"), resume.storage_filename))
        } catch {}
      }
      db.prepare("DELETE FROM resumes WHERE id = ? AND user_id = ?").run(id, session.user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Falha ao remover currículo" }, { status: 500 })
  }
}
