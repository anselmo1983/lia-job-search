import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"
import { completeJson, getDefaultModel } from "@/lib/inference/bifrost"
import { dataPath, writeAtomic } from "@/lib/runtime/data-directory"

// CT223 — extração de perfil. Arquitetura: UI → CT223 → lib/inference/bifrost.ts → CT109.
// Nenhuma credencial vem do cliente; o Bifrost (CT109) é a autoridade de inferência.

const MIN_PROFILE_CHARS = 200
const MAX_PROFILE_CHARS = 8000

const profilePath = dataPath("profile", "profile.json")

const SYSTEM_PROMPT = `Extraia um perfil profissional estruturado deste currículo.
Retorne APENAS JSON com a seguinte estrutura:
{
  "name": string,
  "email": string,
  "phone": string,
  "location": string,
  "languages": string[],
  "education": [{"degree","field","institution","year"}],
  "experience": [{"title","company","period","achievements": string[]}],
  "skills": {"primary": string[], "secondary": string[]},
  "certifications": [{"name","year"}],
  "linkedin": string
}
Se um campo não existir no currículo, use string vazia ou array vazio. Não invente informações.`

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Texto do currículo é obrigatório." }, { status: 400 })
    }

    const trimmed = text.trim()
    if (trimmed.length < MIN_PROFILE_CHARS) {
      return NextResponse.json(
        {
          error: `Texto muito curto para extração (${trimmed.length} caracteres). O mínimo é ${MIN_PROFILE_CHARS} caracteres.`,
        },
        { status: 422 },
      )
    }

    const profile = await completeJson({
      model: getDefaultModel(),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Currículo:\n${trimmed.substring(0, MAX_PROFILE_CHARS)}` }],
      maxTokens: 2500,
    })

    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      return NextResponse.json(
        { error: "Não foi possível extrair um perfil válido do currículo." },
        { status: 422 },
      )
    }

    await writeAtomic(profilePath, profile)

    return NextResponse.json({ profile, persisted: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao extrair perfil"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
