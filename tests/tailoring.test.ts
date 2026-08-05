import assert from "node:assert"
import { extractJobKeywords, calculateAtsKeywordMatch } from "../lib/services/tailoring-engine"
import { CandidateProfile } from "../lib/db/profile-schema"

function runTests() {
  console.log("Starting ATS / Tailoring 10/10 tests...")

  const sampleDescription = `
    Buscamos um desenvolvedor Senior especialista em React, Node.js e TypeScript.
    É necessário ter experiência com Docker, Kubernetes, AWS, PostgreSQL e testes com Jest.
    Diferencial: conhecimentos em Python e GraphQL.
    Buscamos alguém com boa comunicação e trabalho em equipe.
  `

  const candidateProfile: CandidateProfile = {
    identity: {
      fullName: "Anselmo Farias",
      email: "anselmo@example.com",
      phone: "",
      location: "São Paulo, SP",
      headline: "Senior Software Engineer",
      summary: "",
      linkedinUrl: "",
      githubUrl: "",
      languages: [],
      employmentStatus: "Disponível",
    },
    targetPreferences: {
      targetRoles: [],
      targetSectors: [],
      commuteConstraints: "",
      dealbreakers: [],
    },
    skills: {
      primary: ["TypeScript", "Node.js", "React", "Python"],
      secondary: ["Docker", "PostgreSQL"],
      domains: [],
      tools: ["Jest"],
    },
    experiences: [],
    education: [],
    certifications: [],
  }

  // Test 1: Extract Keywords
  const keywords = extractJobKeywords(sampleDescription)
  assert.ok(keywords.technicalSkills.includes("react"), "React should be extracted")
  assert.ok(keywords.technicalSkills.includes("node.js"), "Node.js should be extracted")
  assert.ok(keywords.toolsAndFrameworks.includes("kubernetes"), "Kubernetes should be extracted as tool")
  assert.ok(keywords.softSkills.includes("comunicação"), "Comunicação should be extracted as soft skill")
  console.log("✓ Test 1: Keyword extraction from job description passed")

  // Test 2: Calculate ATS Match
  const matchReport = calculateAtsKeywordMatch(keywords, candidateProfile)
  assert.ok(matchReport.matchScore > 50, `Match score should be > 50%, received ${matchReport.matchScore}%`)
  assert.ok(matchReport.matchedKeywords.includes("react"), "React should be in matched keywords")
  assert.ok(matchReport.missingKeywords.includes("kubernetes"), "Kubernetes should be in missing keywords")
  console.log(`✓ Test 2: ATS Coverage score calculation passed (Score: ${matchReport.matchScore}%)`)

  console.log("\nAll ATS / Tailoring 10/10 tests passed cleanly!")
}

runTests()
