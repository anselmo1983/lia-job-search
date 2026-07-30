import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"

const root = process.cwd()

export async function GET() {
  try {
    const profilePath = path.join(root, ".claude/skills/job-application-assistant/01-candidate-profile.md")
    const content = await fs.readFile(profilePath, "utf8")
    return NextResponse.json({ profile: content })
  } catch {
    return NextResponse.json({ profile: null, message: "Perfil não encontrado. Use /setup ou preencha manualmente." })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const profilePath = path.join(root, ".claude/skills/job-application-assistant/01-candidate-profile.md")
    await fs.writeFile(profilePath, data.profile, "utf8")
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Falha ao salvar perfil" }, { status: 500 })
  }
}
