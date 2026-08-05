import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth/server"
import { getProfileSync } from "@/lib/db/profile-sync"
import { detectFormFields, autoFillFormSchema, DetectedField } from "@/lib/services/form-automation-service"

export async function POST(req: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const profile = getProfileSync()
    if (!profile) {
      return NextResponse.json({ error: "Perfil do candidato não encontrado" }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    let fields: DetectedField[] = []

    if (body.html) {
      fields = detectFormFields(body.html)
    } else if (Array.isArray(body.fields)) {
      fields = body.fields
    } else {
      return NextResponse.json(
        { error: "Envie 'html' (string com formulário HTML) ou 'fields' (array de campos)." },
        { status: 400 }
      )
    }

    const filledFields = autoFillFormSchema(fields, profile)

    return NextResponse.json({
      success: true,
      detectedCount: fields.length,
      filledFields,
    })
  } catch (error: any) {
    console.error("Erro na rota /api/autofill:", error)
    return NextResponse.json(
      { error: "Falha ao preencher formulário automaticamente", details: error?.message },
      { status: 500 }
    )
  }
}
