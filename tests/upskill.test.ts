import assert from "node:assert"
import { CandidateProfileSchema } from "../lib/db/profile-schema"
import { analyzeCandidateSkillGaps } from "../lib/services/upskill-service"

function runTests() {
  console.log("Iniciando testes do módulo de Upskilling & Skill Gap Analysis...")

  const mockProfile = CandidateProfileSchema.parse({
    identity: {
      fullName: "Anselmo Teste",
      email: "anselmo@example.com",
      phone: "+55 11 99999-8888",
      location: "São Paulo, SP",
      headline: "Senior Software Engineer",
      summary: "Desenvolvedor especialista em TypeScript e Node.js.",
      linkedinUrl: "https://linkedin.com/in/anselmo",
      githubUrl: "https://github.com/anselmo",
      languages: [],
      employmentStatus: "Disponível",
    },
    skills: {
      primary: ["TypeScript", "Node.js", "React"],
      secondary: ["SQLite"],
      domains: ["Backend"],
      tools: ["Git"],
    },
    experiences: [],
  })

  const mockJobs = [
    {
      title: "Senior Backend Engineer",
      company: "Cloud Corp",
      description: "Vaga para desenvolvedor com conhecimento em TypeScript, Node.js, Docker, Kubernetes e AWS.",
    },
    {
      title: "DevOps / Infrastructure Engineer",
      company: "Data Inc",
      description: "Buscamos especialistas em Docker, Kubernetes, Python e GCP.",
    },
  ]

  // Executar análise de lacunas
  const report = analyzeCandidateSkillGaps(mockProfile, mockJobs)

  assert.strictEqual(report.totalJobsAnalyzed, 2)
  assert.ok(report.gapSkills.length > 0, "Deve detectar lacunas de habilidades ausentes")

  // Docker e Kubernetes aparecem em ambos os anúncios e não estão no perfil mock
  const dockerGap = report.gapSkills.find((g) => g.skill.toLowerCase() === "docker")
  assert.ok(dockerGap, "Docker deve ser identificado como lacuna")
  assert.strictEqual(dockerGap?.demandCount, 2, "Docker deve ter contagem de demanda igual a 2")

  assert.ok(report.roadmap.length > 0, "Deve gerar o roadmap de aprendizado")
  assert.strictEqual(report.roadmap[0].skill.toLowerCase(), "docker")

  console.log("✓ Test 1: Análise de lacunas e roadmap de upskilling validados com sucesso.")
  console.log("Todos os testes de Upskilling PASSARAM!")
}

runTests()
