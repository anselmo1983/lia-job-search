import fs from "node:fs"
import path from "node:path"
import { getDb } from "@/lib/db"
import { dataPath } from "@/lib/runtime/data-directory"
import { CandidateProfile, CandidateProfileSchema } from "@/lib/db/profile-schema"

function renderClaudeMdSection(profile: CandidateProfile): string {
  const { identity, targetPreferences, skills, experiences, education, certifications } = profile

  const languagesText = identity.languages.map((l) => `${l.language} (${l.level})`).join(", ") || "N/A"
  const primarySkills = skills.primary.join(", ") || "N/A"
  const secondarySkills = skills.secondary.join(", ") || "N/A"
  const domainSkills = skills.domains.join(", ") || "N/A"
  const toolsSkills = skills.tools.join(", ") || "N/A"

  const eduLines = education.length > 0
    ? education.map((e) => `- **${e.degree} em ${e.field}** (${e.startYear}-${e.endYear}) - ${e.institution}${e.thesis ? `\n  - Tese: "${e.thesis}"` : ""}`).join("\n")
    : "- N/A"

  const expLines = experiences.length > 0
    ? experiences.map((exp) => {
        const bullets = exp.highlights.map((h) => `  - ${h}`).join("\n")
        return `- **${exp.role}** (${exp.startDate} - ${exp.endDate}) - **${exp.company}** (${exp.location})\n${bullets}`
      }).join("\n")
    : "- N/A"

  const certLines = certifications && certifications.length > 0
    ? certifications.map((c) => `- **${c.name}**${c.hours ? ` - ${c.hours}h` : ""} - concluído em ${c.completedDate}`).join("\n")
    : "- N/A"

  const sectorsLines = targetPreferences.targetSectors.length > 0
    ? targetPreferences.targetSectors.map((s) => `- ${s}`).join("\n")
    : "- N/A"

  const dealbreakerLines = targetPreferences.dealbreakers.length > 0
    ? targetPreferences.dealbreakers.map((d) => `- ${d}`).join("\n")
    : "- N/A"

  return `## Candidate Profile

### Identity
- **Name:** ${identity.fullName}
- **Location:** ${identity.location || "N/A"} (${targetPreferences.commuteConstraints || "Sem restrições"})
- **Email:** ${identity.email}
- **Phone:** ${identity.phone || "N/A"}
- **Languages:** ${languagesText}
- **Status:** ${identity.employmentStatus}
- **LinkedIn headline:** "${identity.headline || "N/A"}"
- **LinkedIn:** ${identity.linkedinUrl || "N/A"}
- **GitHub:** ${identity.githubUrl || "N/A"}

### Summary
${identity.summary || "N/A"}

### Education
${eduLines}

### Professional Experience
${expLines}

### Technical Skills
- **Primary:** ${primarySkills}
- **Secondary:** ${secondarySkills}
- **Domain:** ${domainSkills}
- **Software:** ${toolsSkills}

### Certifications
${certLines}

### Target Sectors
${sectorsLines}

### Deal-breakers
${dealbreakerLines}`
}

function updateFileSection(filePath: string, newSection: string): void {
  if (!fs.existsSync(filePath)) return

  try {
    const content = fs.readFileSync(filePath, "utf-8")
    const marker = "## Candidate Profile"

    if (content.includes(marker)) {
      const parts = content.split(marker)
      // Preserva o que veio antes do "## Candidate Profile"
      const prefix = parts[0]
      // Procura a próxima seção de nível 2 (## Repo Structure ou similar)
      const remainder = parts[1]
      const nextHeaderIdx = remainder.search(/^##\s+(?!Candidate Profile)/m)

      let suffix = ""
      if (nextHeaderIdx !== -1) {
        suffix = "\n\n" + remainder.slice(nextHeaderIdx)
      }

      const updated = `${prefix.trimEnd()}\n\n${newSection}${suffix}`
      fs.writeFileSync(filePath, updated, "utf-8")
    } else {
      // Se a tag não existia, insere após o cabeçalho
      const updated = `${content.trimEnd()}\n\n${newSection}\n`
      fs.writeFileSync(filePath, updated, "utf-8")
    }
  } catch (err) {
    console.error(`Falha ao sincronizar arquivo ${filePath}:`, err)
  }
}

export async function syncCandidateProfile(userId: string, rawProfile: unknown): Promise<CandidateProfile> {
  const profile = CandidateProfileSchema.parse(rawProfile)
  const db = getDb()

  const structuredJson = JSON.stringify(profile, null, 2)
  const summary = profile.identity.summary || `${profile.identity.fullName} - ${profile.identity.headline}`

  // 1. Atualiza SQLite
  const existing = db.prepare("SELECT id FROM profile WHERE user_id = ?").get(userId)
  if (existing) {
    db.prepare(`
      UPDATE profile 
      SET full_name = ?, email = ?, phone = ?, location = ?, headline = ?, summary = ?, linkedin_url = ?, github_url = ?, structured_json = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(
      profile.identity.fullName,
      profile.identity.email,
      profile.identity.phone,
      profile.identity.location,
      profile.identity.headline,
      summary,
      profile.identity.linkedinUrl,
      profile.identity.githubUrl,
      structuredJson,
      userId
    )
  } else {
    db.prepare(`
      INSERT INTO profile (id, user_id, full_name, email, phone, location, headline, summary, linkedin_url, github_url, structured_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      userId,
      profile.identity.fullName,
      profile.identity.email,
      profile.identity.phone,
      profile.identity.location,
      profile.identity.headline,
      summary,
      profile.identity.linkedinUrl,
      profile.identity.githubUrl,
      structuredJson
    )
  }

  // 2. Grava JSON em data/profile/profile.json
  try {
    const jsonPath = dataPath("profile", "profile.json")
    const dir = path.dirname(jsonPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(jsonPath, structuredJson, "utf-8")
  } catch (err) {
    console.error("Falha ao salvar profile.json:", err)
  }

  // 3. Sincroniza arquivos Markdown (CLAUDE.md e 01-candidate-profile.md)
  const markdownSection = renderClaudeMdSection(profile)
  const rootClaudeMd = path.join(process.cwd(), "CLAUDE.md")
  const agentProfileMd = path.join(process.cwd(), ".claude", "skills", "job-application-assistant", "01-candidate-profile.md")

  updateFileSection(rootClaudeMd, markdownSection)
  updateFileSection(agentProfileMd, markdownSection)

  return profile
}
