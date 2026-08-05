import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth/server"
import { getProfileSync } from "@/lib/db/profile-sync"
import {
  autoFillFormSchema,
  detectFormFields,
  DetectedField,
} from "@/lib/services/form-automation-service"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    const profile = getProfileSync()

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil do candidato não encontrado. Preencha o perfil antes de usar a automação." },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { htmlContent, fields: providedFields, jobId } = body

    let targetFields: DetectedField[] = []

    if (Array.isArray(providedFields) && providedFields.length > 0) {
      targetFields = providedFields
    } else if (htmlContent && typeof htmlContent === "string") {
      targetFields = detectFormFields(htmlContent)
    }

    if (targetFields.length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo de formulário detectado. Forneça o HTML do formulário ou a lista de campos." },
        { status: 400 }
      )
    }

    const filledFields = autoFillFormSchema(targetFields, profile)

    const filledCount = filledFields.filter((f) => f.suggestedValue.trim().length > 0).length
    const totalConfidence = filledFields.reduce((sum, f) => sum + (f.confidenceScore || 60), 0)
    const averageConfidence = Math.round(totalConfidence / filledFields.length)

    return NextResponse.json({
      success: true,
      jobId: jobId || null,
      summary: {
        totalFields: targetFields.length,
        filledFields: filledCount,
        coveragePercentage: Math.round((filledCount / targetFields.length) * 100),
        averageConfidence,
      },
      fields: filledFields,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao gerar auto-fill para o formulário", details: error?.message },
      { status: 500 }
    )
  }
}
