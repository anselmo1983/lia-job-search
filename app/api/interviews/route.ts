import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth/server"
import { getProfileSync } from "@/lib/db/profile-sync"
import { getDb } from "@/lib/db"
import {
  createInterview,
  generateInterviewPrepGuide,
  listInterviews,
} from "@/lib/services/interview-service"

export async function GET() {
  try {
    const session = await getServerSession()
    const userId = session?.user?.id || "local-user"

    const interviews = listInterviews(userId)
    return NextResponse.json({ interviews })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao listar entrevistas", details: error?.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    const userId = session?.user?.id || "local-user"

    const body = await request.json().catch(() => ({}))
    const { jobId, company, role, interviewType, scheduledAt, locationOrLink, notes, generatePrep } = body

    if (!company || !role || !scheduledAt) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes: company, role, scheduledAt" },
        { status: 400 }
      )
    }

    let prepGuide = undefined

    if (generatePrep) {
      const profile = getProfileSync()
      if (profile) {
        let jobDescription = ""
        if (jobId) {
          const db = getDb()
          const jobRow = db
            .prepare("SELECT description FROM jobs WHERE id = ?")
            .get(jobId) as { description: string } | undefined
          if (jobRow) jobDescription = jobRow.description
        }

        prepGuide = generateInterviewPrepGuide(
          { title: role, company, description: jobDescription },
          profile
        )
      }
    }

    const interview = createInterview(userId, {
      jobId,
      company,
      role,
      interviewType,
      scheduledAt,
      locationOrLink,
      notes,
      prepGuide,
    })

    return NextResponse.json({
      success: true,
      interview,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao agendar entrevista", details: error?.message },
      { status: 500 }
    )
  }
}
