import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"
import { dataPath, writeAtomic } from "@/lib/runtime/data-directory"

const root = process.cwd()
const jsonProfilePath = dataPath("profile", "profile.json")
const mdProfilePath = path.join(root, ".claude/skills/job-application-assistant/01-candidate-profile.md")

export async function GET() {
  try {
    // 1. Tenta ler o perfil estruturado em JSON ($LIA_DATA_DIR/profile/profile.json)
    try {
      const jsonContent = await fs.readFile(jsonProfilePath, "utf8")
      const parsed = JSON.parse(jsonContent)
      if (parsed && typeof parsed === "object") {
        return NextResponse.json({ profile: JSON.stringify(parsed, null, 2), structured: parsed })
      }
    } catch {}

    // 2. Fallback: lê o perfil em Markdown (.claude/...)
    const content = await fs.readFile(mdProfilePath, "utf8")
    return NextResponse.json({ profile: content })
  } catch {
    return NextResponse.json({
      profile: null,
      message: "Perfil não encontrado. Envie seu currículo em Configurações para extrair seu perfil.",
    })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const content = typeof data.profile === "string" ? data.profile : JSON.stringify(data.profile, null, 2)
    
    // Salva em ambos os caminhos para consistência total
    try {
      await writeAtomic(jsonProfilePath, data.profile)
    } catch {}

    try {
      await fs.mkdir(path.dirname(mdProfilePath), { recursive: true })
      await fs.writeFile(mdProfilePath, content, "utf8")
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Falha ao salvar perfil" }, { status: 500 })
  }
}
