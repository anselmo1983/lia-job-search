import assert from "node:assert"
import { CandidateProfileSchema, CandidateProfile } from "../lib/db/profile-schema"
import { syncCandidateProfile } from "../lib/db/profile-sync"
import { getDb } from "../lib/db"

async function runTests() {
  console.log("Running Candidate Profile Canônico tests...")

  const sampleProfile: CandidateProfile = CandidateProfileSchema.parse({
    identity: {
      fullName: "Anselmo Farias",
      email: "anselmo@example.com",
      phone: "+55 11 99999-8888",
      location: "São Paulo, SP",
      headline: "Senior Software Engineer / Tech Lead",
      summary: "Engenheiro de software experiente em arquiteturas distribuídas e IA.",
      linkedinUrl: "https://linkedin.com/in/anselmo",
      githubUrl: "https://github.com/anselmo",
      languages: [{ language: "Português", level: "Nativo" }, { language: "Inglês", level: "Avançado" }],
      employmentStatus: "Disponível",
    },
    targetPreferences: {
      targetRoles: ["Software Architect", "Tech Lead", "Senior Backend Engineer"],
      targetSectors: ["Fintech", "Healthtech", "AI Solutions"],
      commuteConstraints: "Híbrido ou Remoto",
      dealbreakers: ["Presencial obrigatório 5x na semana"],
    },
    skills: {
      primary: ["TypeScript", "Node.js", "Python", "React", "Next.js"],
      secondary: ["Docker", "Kubernetes", "PostgreSQL", "SQLite"],
      domains: ["Backend", "AI Agent Systems", "Cloud Computing"],
      tools: ["VS Code", "Git", "Claude Code"],
    },
    experiences: [
      {
        id: "exp-1",
        company: "Tech Corp",
        role: "Senior Software Engineer",
        location: "São Paulo, SP",
        startDate: "2022-01",
        endDate: "Presente",
        highlights: ["Liderou migração para microserviços", "Melhorou performance das APIs em 40%"],
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Universidade de São Paulo",
        degree: "Bacharelado",
        field: "Ciência da Computação",
        startYear: "2015",
        endYear: "2019",
      },
    ],
    certifications: [
      {
        id: "cert-1",
        name: "AWS Certified Solutions Architect",
        hours: 40,
        completedDate: "2023-05",
      },
    ],
  })

  // Test 1: Zod Schema validation
  const result = CandidateProfileSchema.safeParse(sampleProfile)
  assert.strictEqual(result.success, true, "Valid profile should pass Zod validation")
  console.log("✓ Test 1 Passed: Zod schema valid profile")

  // Test 2: Reject invalid email
  const invalidProfile = {
    ...sampleProfile,
    identity: {
      ...sampleProfile.identity,
      email: "email-invalido",
    },
  }
  const invalidResult = CandidateProfileSchema.safeParse(invalidProfile)
  assert.strictEqual(invalidResult.success, false, "Invalid email should fail Zod validation")
  console.log("✓ Test 2 Passed: Zod schema rejected invalid email")

  console.log("All Candidate Profile Canônico tests completed cleanly!")
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
