import assert from "node:assert"
import { extractJobKeywords, calculateAtsKeywordMatch, generateTailoredDocument } from "../lib/services/tailoring-engine"
import { escapeLatex, renderTailoredLatexCv, renderTailoredLatexCoverLetter } from "../lib/services/latex-generator"
import { CandidateProfileSchema } from "../lib/db/profile-schema"

function runTests() {
  console.log("Starting ATS / Tailoring 10/10 tests...")

  const sampleDescription = `
    Buscamos um desenvolvedor Senior especialista em React, Node.js e TypeScript.
    É necessário ter experiência com Docker, Kubernetes, AWS, PostgreSQL e testes com Jest.
    Diferencial: conhecimentos em Python e GraphQL.
    Buscamos alguém com boa comunicação e trabalho em equipe.
  `

  const candidateProfile = CandidateProfileSchema.parse({
    identity: {
      fullName: "Anselmo Farias & CIA",
      email: "anselmo@example.com",
      phone: "+55 11 99999-8888",
      location: "São Paulo, SP",
      headline: "Senior Software Engineer",
      summary: "Especialista com 100% de dedicação & foco em sistemas distributed $100k.",
      linkedinUrl: "https://linkedin.com/in/anselmo",
      githubUrl: "https://github.com/anselmo",
      languages: [],
      employmentStatus: "Disponível",
    },
    targetPreferences: {
      targetRoles: [],
      targetSectors: [],
      commuteConstraints: "",
      dealbreakers: [],
    },
    skills: [
      {
        skill: "TypeScript",
        proficiency: "Senior",
        evidence: ["Liderou migração de 50k LOC com 100% de cobertura"],
        verified: true,
      },
      {
        skill: "Node.js",
        proficiency: "Advanced",
        evidence: ["Construiu microsserviços de alta performance"],
        verified: true,
      },
      {
        skill: "React",
        proficiency: "Senior",
        evidence: ["Front-end em React"],
        verified: true,
      },
      {
        skill: "Python",
        proficiency: "Advanced",
        evidence: ["Automação em Python"],
        verified: true,
      },
      {
        skill: "Docker",
        evidence: ["Containers em producao"],
        verified: true,
      },
      {
        skill: "PostgreSQL",
        evidence: ["Consultas SQL"],
        verified: true,
      },
      {
        skill: "Jest",
        evidence: ["Testes unitarios"],
        verified: true,
      },
      {
        skill: "Comunicação",
        evidence: ["Comunicação transparente"],
        verified: true,
      },
    ],
    experiences: [
      {
        id: "exp-1",
        company: "Tech Solutions Inc.",
        role: "Senior Software Engineer",
        startDate: "2021-01",
        endDate: "Presente",
        highlights: ["Desenvolveu plataforma com 99.99% uptime"],
      },
    ],
    education: [],
    certifications: [],
  })

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

  // Test 3: LaTeX Character Escaping
  const rawText = "100% & $500k #1 _test {code}"
  const escaped = escapeLatex(rawText)
  assert.strictEqual(escaped, "100\\% \\& \\$500k \\#1 \\_test \\{code\\}", "Special LaTeX characters must be escaped")
  console.log("✓ Test 3: LaTeX character escaping passed")

  // Test 4: LaTeX CV Generation
  const jobInfo = { title: "Senior Software Engineer", company: "Acme Corp", description: sampleDescription }
  const cvLatex = renderTailoredLatexCv(candidateProfile, jobInfo)
  assert.ok(cvLatex.includes("\\documentclass[11pt,a4paper,sans]{moderncv}"), "CV must use moderncv documentclass")
  assert.ok(cvLatex.includes("Farias \\& CIA"), "Escaped candidate last name must be rendered")
  assert.ok(cvLatex.includes("Tech Solutions Inc."), "Experience company must be present")
  console.log("✓ Test 4: LaTeX CV generation passed")

  // Test 5: Grounded Cover Letter Generation & Document Orchestrator
  const docResult = generateTailoredDocument(jobInfo, candidateProfile, "both", "latex")
  assert.strictEqual(docResult.docType, "both")
  assert.ok(docResult.cvContent && docResult.cvContent.length > 0, "CV content generated")
  assert.ok(docResult.coverLetterContent && docResult.coverLetterContent.length > 0, "Cover Letter content generated")
  assert.ok(docResult.coverLetterContent.includes("Dear Hiring Team at Acme Corp,"), "Cover letter header present")
  assert.ok(docResult.coverLetterContent.includes("TypeScript"), "Verified SkillEvidence incorporated")
  console.log("✓ Test 5: Grounded Cover Letter generation & Document Orchestrator passed")

  console.log("\nAll ATS / Tailoring 10/10 tests passed cleanly!")
}

runTests()

