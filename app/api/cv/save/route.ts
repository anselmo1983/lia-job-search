import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"

export async function POST(request: Request) {
  try {
    const { content, company, role, format } = await request.json()
    const safeCompany = company.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()
    const safeRole = role.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()
    const ext = format === "latex" ? "tex" : "md"
    const fileName = `main_${safeCompany}_${safeRole}.${ext}`
    
    await fs.writeFile(path.join(process.cwd(), "cv", fileName), content, "utf8")
    
    // Também salvar carta
    return NextResponse.json({ success: true, fileName, path: `cv/${fileName}` })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
