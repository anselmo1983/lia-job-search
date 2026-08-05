import assert from "node:assert"
import { calculateJobFit, JobInput } from "../lib/services/matching-engine"
import { CandidateProfileSchema } from "../lib/db/profile-schema"

function runTests() {
  console.log("Starting Matching Benchmarkado tests...")

  const candidateProfile = CandidateProfileSchema.parse({
    identity: {
      fullName: "Anselmo Farias",
      email: "anselmo@example.com",
      phone: "+55 11 99999-8888",
      location: "São Paulo, SP",
      headline: "Senior Software Engineer",
      summary: "Engenheiro de Software experiente em TypeScript, Node.js e Python.",
      linkedinUrl: "",
      githubUrl: "",
      languages: [],
      employmentStatus: "Disponível",
    },
    targetPreferences: {
      targetRoles: ["Senior Software Engineer", "Software Architect", "Tech Lead"],
      targetSectors: ["Fintech"],
      commuteConstraints: "Remoto",
      dealbreakers: ["Presencial obrigatório"],
    },
    skills: {
      primary: ["TypeScript", "Node.js", "Python", "React"],
      secondary: ["Docker", "SQLite", "PostgreSQL"],
      domains: ["Backend", "AI"],
      tools: ["Git", "VS Code"],
    },
    experiences: [],
    education: [],
    certifications: [],
  })

  // Test 1: Strong Fit Job
  const strongJob: JobInput = {
    title: "Senior Software Engineer",
    company: "Fintech Innovators",
    location: "Remoto (Brasil)",
    description: "Buscamos um Senior Software Engineer especialista em TypeScript, Node.js e Python para atuar em soluções Fintech de alta escala.",
  }

  const resultStrong = calculateJobFit(strongJob, candidateProfile)
  assert.strictEqual(resultStrong.fit, "strong", "Job matching all primary criteria should be strong fit")
  assert.ok(resultStrong.score >= 70, `Score should be >= 70, received ${resultStrong.score}`)
  assert.ok(resultStrong.strengths.length > 0, "Strengths list should not be empty")
  console.log(`✓ Test 1: Strong Fit Job passed (Score: ${resultStrong.score}, Fit: ${resultStrong.fit})`)

  // Test 2: Weak Fit Job with Dealbreaker Constraint
  const weakJob: JobInput = {
    title: "Auxiliar Administrativo Presencial",
    company: "Empresa Tradicional",
    location: "Presencial 5x na semana",
    description: "Vaga para atendimento telefônico e arquivamento de documentos físicos.",
  }

  const resultWeak = calculateJobFit(weakJob, candidateProfile)
  assert.strictEqual(resultWeak.fit, "weak", "Job violating dealbreaker and skills should be weak fit")
  assert.ok(resultWeak.score < 45, `Score should be < 45, received ${resultWeak.score}`)
  assert.ok(resultWeak.gaps.length > 0, "Gaps list should record dealbreaker")
  console.log(`✓ Test 2: Weak Fit Job passed (Score: ${resultWeak.score}, Fit: ${resultWeak.fit})`)

  console.log("\nAll Matching Benchmarkado tests passed cleanly!")
}

runTests()
