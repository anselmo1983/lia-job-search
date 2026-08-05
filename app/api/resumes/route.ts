import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth/server"
import { getDb } from "@/lib/db"
import { CandidateProfileSchema } from "@/lib/db/profile-schema"
import { createCompiledResume, listCompiledResumes } from "@/lib/db/resume-repository"
import { compileResumeDocument } from "@/lib/services/resume-compiler"

export async function GET() {
  try {
    const session = await getServerSession()
    const userId = session?.user?.id || "local-user"

    const resumes = listCompiledResumes(userId)
    return NextResponse.json({ resumes })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao listar currículos compilados", details: error?.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    const userId = session?.user?.id || "local-user"

    const body = await request.json().catch(() => ({}))
    const { jobId, customTitle } = body

    // Obter perfil do usuário
    const db = getDb()
    const profileRow = db.prepare("SELECT structured_json FROM profile WHERE user_id = ?").get(userId) as
      | { structured_json: string }
      | undefined

    if (!profileRow || !profileRow.structured_json) {
      return NextResponse.json(
        { error: "Perfil do candidato não encontrado. Preencha o perfil antes de compilar." },
        { status: 400 }
      )
    }

    const rawProfile = JSON.parse(profileRow.structured_json)
    const profile = CandidateProfileSchema.parse(rawProfile)

    // Se um jobId for fornecido, buscar contexto da vaga
    let targetJob = undefined
    if (jobId) {
      const jobRow = db
        .prepare("SELECT id, title, company, description FROM jobs WHERE id = ?")
        .get(jobId) as { id: string; title: string; company: string; description: string } | undefined

      if (jobRow) {
        targetJob = {
          id: jobRow.id,
          title: jobRow.title,
          company: jobRow.company,
          description: jobRow.description,
        }
      }
    }

    // Compilar ResumeDocument
    const compiledDoc = compileResumeDocument(profile, targetJob)
    if (customTitle) {
      compiledDoc.title = customTitle
    }

    // Salvar no repositório
    const result = createCompiledResume(
      userId,
      compiledDoc,
      session?.user?.email || "user",
      jobId ? `Compilado para vaga ${targetJob?.title}` : "Compilação canônica inicial"
    )

    return NextResponse.json({
      success: true,
      resume: result.resume,
      version: result.version,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao compilar currículo", details: error?.message },
      { status: 500 }
    )
  }
}
