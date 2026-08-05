import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getProfileSync } from "@/lib/db/profile-sync"
import { analyzeCandidateSkillGaps } from "@/lib/services/upskill-service"

export async function GET() {
  try {
    const profile = getProfileSync()
    if (!profile) {
      return NextResponse.json(
        { error: "Perfil do candidato não encontrado para análise de upskilling" },
        { status: 400 }
      )
    }

    const db = getDb()
    const jobs = db
      .prepare("SELECT title, company, description FROM jobs")
      .all() as Array<{ title: string; company: string; description: string }>

    const upskillReport = analyzeCandidateSkillGaps(profile, jobs)

    return NextResponse.json({
      success: true,
      upskillReport,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao gerar relatório de upskilling", details: error?.message },
      { status: 500 }
    )
  }
}
