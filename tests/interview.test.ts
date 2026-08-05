import assert from "node:assert"
import { CandidateProfileSchema } from "../lib/db/profile-schema"
import { generateInterviewPrepGuide } from "../lib/services/interview-service"

function runTests() {
  console.log("Iniciando testes do módulo de Gestão de Entrevistas & Simulador STAR...")

  const mockProfile = CandidateProfileSchema.parse({
    identity: {
      fullName: "Anselmo Teste",
      email: "anselmo@example.com",
      phone: "+55 11 99999-8888",
      location: "São Paulo, SP",
      headline: "Senior Software Architect",
      summary: "Engenheiro especializado em sistemas distribuídos e IA.",
      linkedinUrl: "https://linkedin.com/in/anselmo",
      githubUrl: "https://github.com/anselmo",
      languages: [],
      employmentStatus: "Disponível",
    },
    skills: {
      primary: ["TypeScript", "Node.js", "Python"],
      secondary: ["Docker", "SQLite"],
      domains: ["Backend", "AI Systems"],
      tools: ["Git", "VS Code"],
    },
    experiences: [
      {
        company: "Omnia Tech",
        role: "Lead Architect",
        location: "Remoto",
        startDate: "2023",
        endDate: "Presente",
        highlights: [
          "Arquitetou plataforma de microsserviços reduzindo latência em 50%",
          "Liderou equipe de 8 engenheiros sêniores",
        ],
      },
    ],
  })

  // Test 1: Gerar Guia de Preparação STAR
  const prep = generateInterviewPrepGuide(
    {
      title: "Senior Full Stack Engineer",
      company: "Acme Corp",
      description: "Vaga para desenvolvedor especializado em TypeScript e Node.js com foco em resiliência.",
    },
    mockProfile
  )

  assert.strictEqual(prep.company, "Acme Corp")
  assert.ok(prep.technicalQuestions.length > 0, "Deve gerar perguntas técnicas")
  assert.ok(prep.starBehavioralAnswers.length > 0, "Deve gerar respostas STAR")
  assert.strictEqual(prep.starBehavioralAnswers[0].sourceExperienceCompany, "Omnia Tech")
  assert.ok(prep.starBehavioralAnswers[0].situation.includes("Omnia Tech"))
  assert.ok(prep.questionsToAskInterviewer.length >= 3, "Deve sugerir perguntas estratégicas para o entrevistador")
  console.log("✓ Test 1: Geração de Guia de Preparação STAR validada com sucesso.")

  console.log("Todos os testes de Gestão de Entrevistas PASSARAM!")
}

runTests()
