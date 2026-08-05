import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { requireSession, getServerSession } from "@/lib/auth/server"
import { runLegacyMigration } from "@/lib/db/legacy-migration"

export async function GET() {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 })
    }

    const db = getDb()
    let profile = db.prepare("SELECT * FROM profile WHERE user_id = ?").get(session.user.id) as any

    if (!profile) {
      // Tenta rodar migração legado uma vez se nenhum perfil for encontrado
      await runLegacyMigration()
      profile = db.prepare("SELECT * FROM profile WHERE user_id = ?").get(session.user.id) as any
    }

    if (profile) {
      let structured = null
      if (profile.structured_json) {
        try {
          structured = JSON.parse(profile.structured_json)
        } catch {}
      }

      return NextResponse.json({
        profile: profile.summary || JSON.stringify(profile, null, 2),
        structured: structured || profile,
      })
    }

    return NextResponse.json({
      profile: null,
      message: "Perfil não encontrado. Envie seu currículo para extrair seu perfil.",
    })
  } catch (error) {
    return NextResponse.json({ error: "Falha ao obter perfil" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 })
    }

    const data = await request.json()
    const db = getDb()

    const inputProfile = data.profile || data
    const fullName = inputProfile.full_name || inputProfile.name || session.user.name || "Anselmo Farias"
    const email = inputProfile.email || session.user.email
    const phone = inputProfile.phone || null
    const location = inputProfile.location || null
    const headline = inputProfile.headline || null
    const summary = typeof inputProfile === "string" ? inputProfile : inputProfile.summary || JSON.stringify(inputProfile)
    const linkedin = inputProfile.linkedin_url || null
    const github = inputProfile.github_url || null
    const structuredJson = typeof inputProfile === "object" ? JSON.stringify(inputProfile) : null

    const existing = db.prepare("SELECT id FROM profile WHERE user_id = ?").get(session.user.id)

    if (existing) {
      db.prepare(`
        UPDATE profile 
        SET full_name = ?, email = ?, phone = ?, location = ?, headline = ?, summary = ?, linkedin_url = ?, github_url = ?, structured_json = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(fullName, email, phone, location, headline, summary, linkedin, github, structuredJson, session.user.id)
    } else {
      db.prepare(`
        INSERT INTO profile (id, user_id, full_name, email, phone, location, headline, summary, linkedin_url, github_url, structured_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), session.user.id, fullName, email, phone, location, headline, summary, linkedin, github, structuredJson)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Falha ao salvar perfil" }, { status: 500 })
  }
}
