import { NextResponse } from "next/server"
import { readFileSync, existsSync } from "fs"
import { dataPath } from "@/lib/runtime/data-directory"
import { requireSession, getServerSession } from "@/lib/auth/server"
import { getDb } from "@/lib/db"
import { runMultiSourceDiscovery } from "@/lib/services/discovery-service"

export async function POST(request: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized

  try {
    const body: {
      query?: string
      location?: string
    } = await request.json()

    let query = (body.query ?? "").trim()
    let location = (body.location ?? "").trim()

    if (!query) {
      try {
        const session = await getServerSession()
        if (session?.user?.id) {
          const db = getDb()
          const profileRow = db.prepare("SELECT * FROM profile WHERE user_id = ?").get(session.user.id) as any
          if (profileRow?.structured_json) {
            const parsed = JSON.parse(profileRow.structured_json)
            query = parsed.identity?.headline || parsed.targetPreferences?.targetRoles?.[0] || (Array.isArray(parsed.skills?.primary) ? parsed.skills.primary.join(" ") : parsed.skills?.primary) || ""
            if (!location && parsed.identity?.location) location = String(parsed.identity.location)
          }
        }
      } catch {}

      if (!query) {
        try {
          const jsonProfilePath = dataPath("profile", "profile.json")
          if (existsSync(jsonProfilePath)) {
            const parsed = JSON.parse(readFileSync(jsonProfilePath, "utf-8"))
            query = parsed.role || (Array.isArray(parsed.skills?.primary) ? parsed.skills.primary.join(" ") : parsed.skills?.primary) || parsed.title || ""
            if (!location && parsed.location) location = String(parsed.location)
          }
        } catch {}
      }
    }

    if (!query) {
      query = "desenvolvedor software"
    }

    const { results, sourceDiagnostics } = await runMultiSourceDiscovery(query, location)

    // Filtro adicional por localização se especificado
    let filteredJobs = results
    if (location) {
      const locLower = location.toLowerCase()
      const isBrazilQuery = locLower.includes("brasil") || locLower.includes("brazil") || locLower === "br"
      filteredJobs = results.filter((job) => {
        const locStr = job.locations[0]?.rawLocation || [job.locations[0]?.city, job.locations[0]?.state].filter(Boolean).join(", ") || ""
        if (!locStr) return true
        const jobLoc = locStr.toLowerCase()
        if (jobLoc.includes(locLower)) return true
        if (jobLoc.includes("remote") || jobLoc.includes("remoto") || jobLoc.includes("home office")) return true
        if (isBrazilQuery && (jobLoc.includes("brasil") || jobLoc.includes("brazil") || jobLoc.includes("br") || jobLoc.includes("saul") || jobLoc.includes("paulo") || jobLoc.includes("rio"))) return true
        return false
      })
    }

    return NextResponse.json({ results: filteredJobs, sourceDiagnostics })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
