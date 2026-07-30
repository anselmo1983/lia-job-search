import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"

export async function POST(request: Request) {
  try {
    const { company, role, status, notes, date } = await request.json()
    const trackerPath = path.join(process.cwd(), "job_search_tracker.csv")
    
    let csv = ""
    try { csv = await fs.readFile(trackerPath, "utf8") } catch { csv = "date,company,sector,role,role_type,channel,status,contact_person,fit_rating,notes,cv_file,cover_letter_file,source\n" }
    
    const newRow = `${date || new Date().toISOString().split("T")[0]},${company},,${role},,,${status},,,${notes || ""},,,\n`
    csv += newRow
    await fs.writeFile(trackerPath, csv, "utf8")
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const csv = await fs.readFile(path.join(process.cwd(), "job_search_tracker.csv"), "utf8")
    const lines = csv.trim().split("\n")
    const headers = lines[0].split(",")
    const applications = lines.slice(1).filter(Boolean).map(line => {
      const values = line.split(",")
      const obj: any = {}
      headers.forEach((h, i) => obj[h.trim()] = (values[i] || "").trim())
      return obj
    })
    return NextResponse.json({ applications })
  } catch {
    return NextResponse.json({ applications: [] })
  }
}
