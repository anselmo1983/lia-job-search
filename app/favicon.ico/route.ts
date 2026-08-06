import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"

export async function GET() {
  try {
    const iconPath = path.join(process.cwd(), "public", "icon.svg")
    const svg = await fs.readFile(iconPath)
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
