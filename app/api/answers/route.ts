import { NextResponse } from "next/server"
import { requireSession, getServerSession } from "@/lib/auth/server"
import { getProfileSync, syncCandidateProfile } from "@/lib/db/profile-sync"

export async function GET() {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const profile = getProfileSync()
    if (!profile) {
      return NextResponse.json({ error: "Perfil do candidato não encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      facts: profile.applicationFacts || [],
      vault: profile.answerVault || [],
    })
  } catch (error: any) {
    console.error("Erro no GET /api/answers:", error)
    return NextResponse.json({ error: "Falha ao obter respostas do vault" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 })
    }

    const profile = getProfileSync()
    if (!profile) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 })
    }

    const body = await req.json()
    const { questionText, answerText, factKey, factValue, category = "screener" } = body

    const updatedProfile = { ...profile }

    if (questionText && answerText) {
      const vault = [...(updatedProfile.answerVault || [])]
      const existingIdx = vault.findIndex(
        (v) => v.questionText.toLowerCase().trim() === questionText.toLowerCase().trim()
      )

      if (existingIdx !== -1) {
        vault[existingIdx] = {
          ...vault[existingIdx],
          answerText,
          category,
          lastUsedAt: new Date().toISOString(),
        }
      } else {
        vault.push({
          id: crypto.randomUUID(),
          questionHash: "",
          questionText,
          answerText,
          category,
          lastUsedAt: new Date().toISOString(),
        })
      }
      updatedProfile.answerVault = vault
    }

    if (factKey && factValue) {
      const facts = [...(updatedProfile.applicationFacts || [])]
      const existingFactIdx = facts.findIndex(
        (f) => f.factKey.toLowerCase().trim() === factKey.toLowerCase().trim()
      )

      if (existingFactIdx !== -1) {
        facts[existingFactIdx] = {
          ...facts[existingFactIdx],
          factValue,
          category,
          verified: true,
        }
      } else {
        facts.push({
          id: crypto.randomUUID(),
          category,
          factKey,
          factValue,
          evidence: "Manual input",
          verified: true,
        })
      }
      updatedProfile.applicationFacts = facts
    }

    const synced = await syncCandidateProfile(session.user.id, updatedProfile)

    return NextResponse.json({
      success: true,
      facts: synced.applicationFacts,
      vault: synced.answerVault,
    })
  } catch (error: any) {
    console.error("Erro no POST /api/answers:", error)
    return NextResponse.json({ error: "Falha ao salvar resposta no vault", details: error?.message }, { status: 500 })
  }
}
