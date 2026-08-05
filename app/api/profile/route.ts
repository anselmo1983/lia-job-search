import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { requireSession, getServerSession } from "@/lib/auth/server"
import { runLegacyMigration } from "@/lib/db/legacy-migration"
import { syncCandidateProfile } from "@/lib/db/profile-sync"
import { CandidateProfileSchema } from "@/lib/db/profile-schema"

export async function GET() {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 })
    }

    const db = getDb()
    let profileRow = db.prepare("SELECT * FROM profile WHERE user_id = ?").get(session.user.id) as any

    if (!profileRow) {
      // Tenta migração legado se nenhum perfil SQLite existir
      await runLegacyMigration()
      profileRow = db.prepare("SELECT * FROM profile WHERE user_id = ?").get(session.user.id) as any
    }

    if (profileRow) {
      let structured = null
      if (profileRow.structured_json) {
        try {
          const parsed = JSON.parse(profileRow.structured_json)
          const result = CandidateProfileSchema.safeParse(parsed)
          structured = result.success ? result.data : parsed
        } catch {}
      }

      return NextResponse.json({
        profile: profileRow.summary || JSON.stringify(profileRow, null, 2),
        structured: structured || profileRow,
      })
    }

    return NextResponse.json({
      profile: null,
      message: "Perfil não encontrado. Envie seu currículo ou preencha suas informações.",
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
    const inputProfile = data.profile || data

    // Se vier um objeto parcial ou simplificado, ajusta campos básicos antes de validar
    if (typeof inputProfile === "object" && inputProfile !== null && !inputProfile.identity) {
      const formattedInput = {
        identity: {
          fullName: inputProfile.full_name || inputProfile.name || session.user.name || "Candidato LJS",
          email: inputProfile.email || session.user.email || "user@example.com",
          phone: inputProfile.phone || "",
          location: inputProfile.location || "",
          headline: inputProfile.headline || "",
          summary: inputProfile.summary || "",
          linkedinUrl: inputProfile.linkedin_url || inputProfile.linkedin || "",
          githubUrl: inputProfile.github_url || inputProfile.github || "",
          languages: inputProfile.languages || [],
          employmentStatus: inputProfile.status || "Disponível",
        },
        targetPreferences: {
          targetRoles: inputProfile.target_roles || [],
          targetSectors: inputProfile.target_sectors || [],
          commuteConstraints: inputProfile.commute_constraints || "",
          dealbreakers: inputProfile.dealbreakers || [],
        },
        skills: {
          primary: Array.isArray(inputProfile.skills?.primary) ? inputProfile.skills.primary : (typeof inputProfile.skills === "string" ? [inputProfile.skills] : []),
          secondary: Array.isArray(inputProfile.skills?.secondary) ? inputProfile.skills.secondary : [],
          domains: Array.isArray(inputProfile.skills?.domains) ? inputProfile.skills.domains : [],
          tools: Array.isArray(inputProfile.skills?.tools) ? inputProfile.skills.tools : [],
        },
        experiences: inputProfile.experiences || [],
        education: inputProfile.education || [],
        certifications: inputProfile.certifications || [],
      }

      const synced = await syncCandidateProfile(session.user.id, formattedInput)
      return NextResponse.json({ success: true, profile: synced })
    }

    const synced = await syncCandidateProfile(session.user.id, inputProfile)
    return NextResponse.json({ success: true, profile: synced })
  } catch (error: any) {
    console.error("Erro no salvamento do perfil:", error)
    return NextResponse.json(
      { error: "Falha ao salvar perfil", details: error?.errors || String(error) },
      { status: 400 }
    )
  }
}
