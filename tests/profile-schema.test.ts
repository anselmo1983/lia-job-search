import assert from "node:assert"
import { CandidateProfileSchema, CandidateProfileInput } from "../lib/db/profile-schema"

function runTests() {
  console.log("Starting Candidate Profile Schema tests...")

  const validProfile: CandidateProfileInput = {
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
  if (result.success) {
    assert.strictEqual(result.data.meta.version, 1)
  }
  console.log("✓ Test 1: Candidate Profile Zod validation passed with meta defaults")

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

  // Test 4: Canonical Candidate Profile with SkillEvidence & Extended Fields
  const canonicalProfileInput = {
    ...validProfile,
    projects: [
      {
        id: "proj-1",
        name: "LJS Job Search Assistant",
        description: "Plataforma inteligente de busca e candidatura a empregos",
        role: "Lead Architect",
        techStack: ["Next.js", "TypeScript", "SQLite"],
        highlights: ["Desenvolveu motor de matching e automação"],
      },
    ],
    skills: [
      {
        skill: "TypeScript",
        proficiency: "Senior",
        evidence: ["Construiu microsserviços multi-tenant em TS", "Tipagem estrita em 50k+ LOC"],
        sourceIds: ["exp-1", "proj-1"],
        verified: true,
      },
      {
        skill: "Node.js",
        proficiency: "Advanced",
        evidence: ["APIs de alta performance em Node"],
        sourceIds: ["exp-1"],
        verified: true,
      },
    ],
    preferences: {
      targetRoles: ["Software Architect", "Staff Engineer"],
      targetSectors: ["AI", "Fintech"],
      desiredWorkMode: "Remoto",
      energizingActivities: ["Arquitetura de sistemas", "Mentoria técnica", "Build de produtos do zero"],
      drainingActivities: ["Reuniões sem pauta", "Processos manuais burocráticos"],
      transferableSkills: ["Resolução de problemas complexos", "Comunicação executiva"],
    },
    constraints: {
      commute: "Remoto apenas",
      dealbreakers: ["Presencial obrigatório 5x/semana"],
      noticePeriod: "2 semanas",
      workAuthorization: "Brasil / PJ / CLT",
    },
    applicationFacts: [
      {
        factKey: "Salário Pretendido",
        factValue: "R$ 18.000 / mês PJ",
        verified: true,
      },
    ],
    answerVault: [
      {
        questionText: "Por que você quer trabalhar nesta empresa?",
        answerText: "Admiro o produto e a cultura de inovação focada em impacto real.",
        category: "screener",
      },
    ],
    sourceDocuments: [
      {
        filename: "cv_anselmo_2026.pdf",
        docType: "cv",
        contentText: "Anselmo Farias - Curriculum Vitae...",
      },
    ],
  }

  const canonicalParsed = CandidateProfileSchema.safeParse(canonicalProfileInput)
  assert.strictEqual(canonicalParsed.success, true, "Canonical profile must parse successfully")
  if (canonicalParsed.success) {
    const data = canonicalParsed.data
    assert.strictEqual(data.projects.length, 1)
    assert.strictEqual(data.skills.evidences.length, 2)
    assert.strictEqual(data.skills.evidences[0].verified, true)
    assert.deepStrictEqual(data.preferences.energizingActivities, ["Arquitetura de sistemas", "Mentoria técnica", "Build de produtos do zero"])
    assert.strictEqual(data.constraints.noticePeriod, "2 semanas")
    assert.strictEqual(data.applicationFacts[0].factKey, "Salário Pretendido")
    assert.strictEqual(data.answerVault[0].category, "screener")
    assert.strictEqual(data.sourceDocuments[0].docType, "cv")
  }
  console.log("✓ Test 4: Canonical Candidate Profile with SkillEvidence & Vault passed")

  console.log("\nAll Candidate Profile Canônico schema tests passed cleanly!")
}

runTests()

