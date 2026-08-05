import assert from "node:assert"
import { CandidateProfileSchema, CandidateProfile } from "../lib/db/profile-schema"

function runTests() {
  console.log("Starting Candidate Profile Schema tests...")

  const validProfile: CandidateProfile = {
    identity: {
      fullName: "Anselmo Farias",
      email: "anselmo@example.com",
      phone: "+55 11 99999-8888",
      location: "São Paulo, SP",
      headline: "Senior Software Engineer",
      summary: "Engenheiro de software especializado em IA e sistemas web.",
      linkedinUrl: "https://linkedin.com/in/anselmo",
      githubUrl: "https://github.com/anselmo",
      languages: [{ language: "Português", level: "Nativo" }],
      employmentStatus: "Disponível",
    },
    targetPreferences: {
      targetRoles: ["Software Architect", "Tech Lead"],
      targetSectors: ["Fintech", "AI"],
      commuteConstraints: "Remoto",
      dealbreakers: ["Presencial"],
    },
    skills: {
      primary: ["TypeScript", "Node.js", "Python"],
      secondary: ["Docker", "SQLite"],
      domains: ["Backend", "AI Agents"],
      tools: ["VS Code", "Git"],
    },
    experiences: [
      {
        id: "exp-1",
        company: "Tech Corp",
        role: "Senior Software Engineer",
        location: "São Paulo",
        startDate: "2022-01",
        endDate: "Presente",
        highlights: ["Liderou projeto principal"],
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "USP",
        degree: "Bacharelado",
        field: "Ciência da Computação",
        startYear: "2015",
        endYear: "2019",
      },
    ],
    certifications: [
      {
        id: "cert-1",
        name: "AWS Certified Architect",
        completedDate: "2023-05",
      },
    ],
  }

  // Test 1: Valid Profile
  const result = CandidateProfileSchema.safeParse(validProfile)
  assert.strictEqual(result.success, true, "Valid profile must pass schema validation")
  console.log("✓ Test 1: Candidate Profile Zod validation passed")

  // Test 2: Invalid Email
  const invalidProfile = {
    ...validProfile,
    identity: {
      ...validProfile.identity,
      email: "not-an-email",
    },
  }
  const invalidResult = CandidateProfileSchema.safeParse(invalidProfile)
  assert.strictEqual(invalidResult.success, false, "Invalid email must fail schema validation")
  console.log("✓ Test 2: Invalid email rejected properly")

  // Test 3: Default fallbacks for missing optional lists
  const minimalInput = {
    identity: {
      fullName: "Candidato Teste",
      email: "teste@example.com",
    },
  }
  const minimalParsed = CandidateProfileSchema.safeParse(minimalInput)
  assert.strictEqual(minimalParsed.success, true, "Minimal profile with defaults must parse successfully")
  if (minimalParsed.success) {
    assert.strictEqual(minimalParsed.data.identity.employmentStatus, "Disponível")
    assert.deepStrictEqual(minimalParsed.data.skills.primary, [])
  }
  console.log("✓ Test 3: Default fallbacks generated successfully")

  console.log("\nAll Candidate Profile Canônico schema tests passed cleanly!")
}

runTests()
