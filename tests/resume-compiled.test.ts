import assert from "node:assert"
import { getDb } from "../lib/db"
import { CandidateProfileSchema } from "../lib/db/profile-schema"
import { compileResumeDocument } from "../lib/services/resume-compiler"
import { applyJsonPatch } from "../lib/services/resume-patch"
import { renderResumeDocument } from "../lib/services/resume-renderer"
import {
  createCompiledResume,
  getCompiledResume,
  updateCompiledResumeWithPatch,
  listResumeVersions,
  rollbackResumeToVersion,
  deleteCompiledResume,
} from "../lib/db/resume-repository"

function runTests() {
  console.log("Iniciando testes de Engenharia Reversa Resume Schema, Editor e Compilação...")

  // 1. Perfil Mock Canônico
  const mockProfile = CandidateProfileSchema.parse({
    identity: {
      fullName: "Anselmo Teste",
      email: "anselmo.test@example.com",
      phone: "+55 11 99999-0000",
      location: "São Paulo, SP",
      headline: "Staff Software Engineer",
      summary: "Engenheiro de software especializado em arquitetura distribuída.",
      linkedinUrl: "https://linkedin.com/in/anselmotest",
      githubUrl: "https://github.com/anselmotest",
      languages: [{ language: "Português", level: "Nativo" }],
      employmentStatus: "Disponível",
    },
    skills: {
      primary: ["TypeScript", "Node.js", "Python"],
      secondary: ["Docker", "SQLite"],
      domains: ["Backend", "AI Agents"],
      tools: ["Git", "VS Code"],
    },
    experiences: [
      {
        company: "Tech Corp",
        role: "Senior Backend Developer",
        location: "Remoto",
        startDate: "2022",
        endDate: "Presente",
        highlights: ["Liderou projeto de microsserviços", "Aumentou throughput em 40%"],
        skillsUsed: ["TypeScript", "Node.js"],
      },
    ],
    education: [
      {
        institution: "Universidade de São Paulo",
        degree: "Bacharelado",
        field: "Ciência da Computação",
        startYear: "2015",
        endYear: "2019",
      },
    ],
  })

  // 2. Compilar ResumeDocument
  const compiledDoc = compileResumeDocument(mockProfile, {
    title: "Engenheiro de Software Senior",
    company: "Empresa Inovadora",
    description: "Vaga para especialista em TypeScript, React, Node.js e Docker",
  })

  assert.strictEqual(compiledDoc.basics.fullName, "Anselmo Teste")
  assert.strictEqual(compiledDoc.sections.experiences.length, 1)
  assert.ok(compiledDoc.sections.skills.primary.includes("TypeScript"))
  console.log("✓ Compilação CandidateProfile -> ResumeDocument validada.")

  // 3. Renderização LaTeX & HTML
  const latexOutput = renderResumeDocument(compiledDoc, "latex")
  assert.strictEqual(latexOutput.format, "latex")
  assert.ok(latexOutput.content.includes("moderncv"))
  assert.ok(latexOutput.content.includes("Anselmo"))

  const htmlOutput = renderResumeDocument(compiledDoc, "html")
  assert.strictEqual(htmlOutput.format, "html")
  assert.ok(htmlOutput.content.includes("Anselmo Teste"))
  assert.ok(htmlOutput.content.includes("Tech Corp"))
  console.log("✓ Renderização LaTeX e HTML validada.")

  // 4. Teste de JSON Patch (RFC 6902)
  const patchOps = [
    { op: "replace" as const, path: "/basics/headline", value: "Principal Software Architect" },
    { op: "add" as const, path: "/sections/skills/primary/-", value: "Rust" },
  ]

  const { patchedDocument, appliedCount } = applyJsonPatch(compiledDoc, patchOps)
  assert.strictEqual(appliedCount, 2)
  assert.strictEqual(patchedDocument.basics.headline, "Principal Software Architect")
  assert.ok(patchedDocument.sections.skills.primary.includes("Rust"))
  console.log("✓ Motor de JSON Patch (RFC 6902) validado com sucesso.")

  // 5. Teste de Persistência SQLite & Rollback de Versões
  const db = getDb()
  const testUserId = "user-test-" + Date.now()

  // Inserir usuário dummy para satisfazer FK
  db.prepare(
    "INSERT OR IGNORE INTO user (id, name, email, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)"
  ).run(testUserId, "Test User", `${testUserId}@example.com`, Date.now(), Date.now())

  const created = createCompiledResume(testUserId, compiledDoc, "user", "Versão inicial de teste")
  assert.strictEqual(created.version.versionNumber, 1)

  const retrieved = getCompiledResume(created.resume.id)
  assert.ok(retrieved)
  assert.strictEqual(retrieved?.basics.fullName, "Anselmo Teste")

  // Aplicar nova versão no repositório
  const version2 = updateCompiledResumeWithPatch(
    created.resume.id,
    patchOps,
    patchedDocument,
    "agent:tailoring",
    "Atualizado cargo e adicionado Rust"
  )
  assert.ok(version2)
  assert.strictEqual(version2?.versionNumber, 2)

  const versionsList = listResumeVersions(created.resume.id)
  assert.strictEqual(versionsList.length, 2)

  // Reverter para a Versão 1 (Rollback)
  const rollbackVersion = rollbackResumeToVersion(created.resume.id, 1, "user")
  assert.ok(rollbackVersion)
  assert.strictEqual(rollbackVersion?.versionNumber, 3)

  const docAfterRollback = getCompiledResume(created.resume.id)
  assert.strictEqual(docAfterRollback?.basics.headline, "Staff Software Engineer")
  console.log("✓ Persistência SQLite, Versionamento e Rollback validados com sucesso.")

  // Clean up
  deleteCompiledResume(created.resume.id)
  db.prepare("DELETE FROM user WHERE id = ?").run(testUserId)
  console.log("✓ Cleanup concluído. Todos os testes de Resume Schema & Compiler PASSARAM!")
}

runTests()
