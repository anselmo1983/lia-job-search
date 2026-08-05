import assert from "node:assert"
import { canonicalJobUrl, generateUrlHash, generateContentHash } from "../lib/services/discovery-service"
import { calculateJobFit } from "../lib/services/matching-engine"
import { transitionJobStatus, transitionJobsInBulk, getJobTransitionHistory } from "../lib/services/job-transition-service"
import { getDb } from "../lib/db"
import { CandidateProfileSchema } from "../lib/db/profile-schema"

function runJobNavigatorTests() {
  console.log("=== INICIANDO TESTES DO BENCHMARK JOBNAVIGATOR ===")

  const testJobId = "test_jn_job_123"
  const db = getDb()

  // Clean state
  db.prepare("DELETE FROM job_status_history WHERE job_id = ?").run(testJobId)
  db.prepare("DELETE FROM jobs WHERE id = ?").run(testJobId)
  db.prepare(`
    INSERT INTO jobs (id, source, source_url, company, title, location, description, status)
    VALUES (?, 'linkedin', 'https://linkedin.com/jobs/view/12345?utm_source=google#apply', 'Tech Corp', 'Senior Full Stack Engineer', 'Remote - Brazil', 'React TypeScript Node AWS', 'discovered')
  `).run(testJobId)

  // Test 1: Canonicalização de URL
  const rawUrl = "https://BR.indeed.com/viewjob?jk=99999&utm_source=linkedin&utm_campaign=hiring#apply"
  const canonical = canonicalJobUrl(rawUrl)
  assert.strictEqual(canonical, "https://br.indeed.com/viewjob?jk=99999", "URL deve ser higienizada sem UTM e hash")
  console.log("✓ Teste 1: Canonicalização de URL passou com sucesso")

  // Test 2: Hashing Dual (URL + Content Fingerprint)
  const urlHash = generateUrlHash(rawUrl)
  const contentHash = generateContentHash("Senior Full Stack Engineer", "Tech Corp", "React TypeScript Node AWS")
  assert.strictEqual(urlHash.length, 64, "urlHash deve ter 64 caracteres SHA-256")
  assert.strictEqual(contentHash.length, 64, "contentHash deve ter 64 caracteres SHA-256")
  console.log("✓ Teste 2: Hashing Dual (urlHash & contentHash) passou com sucesso")

  // Test 3: Sub-Scores no Score Report
  const mockProfile = CandidateProfileSchema.parse({
    identity: {
      fullName: "Dev Silva",
      email: "dev@example.com",
      phone: "+55 11 99999-8888",
      headline: "Senior Full Stack Engineer",
      location: "Brasil",
      employmentStatus: "Disponível",
      languages: [],
    },
    targetPreferences: {
      targetRoles: ["Senior Full Stack Engineer"],
      targetSectors: ["Tecnologia"],
      commuteConstraints: "Remoto",
      dealbreakers: [],
    },
    skills: {
      primary: ["React", "TypeScript", "Node.js"],
      secondary: ["AWS", "SQL"],
      domains: ["Full Stack"],
      tools: ["Git"],
    },
    experiences: [],
    education: [],
    certifications: [],
  })

  const fit = calculateJobFit(
    {
      title: "Senior Full Stack Engineer",
      description: "Requisitos: React, TypeScript, Node.js, AWS",
      company: "Tech Corp",
      location: "Remoto - Brasil",
    },
    mockProfile
  )

  assert.ok(fit.score >= 70, `Score deve ser >= 70, recebido ${fit.score}`)
  assert.strictEqual(fit.fit, "strong", "Fit deve ser STRONG")
  assert.ok(fit.subScores, "Sub-scores devem estar presentes no resultado")
  assert.ok(fit.subScores.skillScore > 0, "skillScore deve ser maior que 0")
  assert.strictEqual(fit.subScores.titleScore, 100, "titleScore deve ser 100")
  console.log(`✓ Teste 3: Fit & Score Report passou com sucesso (Score: ${fit.score}/100)`)

  // Test 4: Transição de Status & Audit Trail
  const res1 = transitionJobStatus(testJobId, "bookmarked", "user", "Salvo pelo usuário")
  assert.strictEqual(res1.success, true, "Transição 1 deve ter sucesso")
  assert.strictEqual(res1.fromStatus, "discovered")
  assert.strictEqual(res1.toStatus, "bookmarked")

  const res2 = transitionJobStatus(testJobId, "applied", "agent", "Candidatura automática enviada")
  assert.strictEqual(res2.success, true, "Transição 2 deve ter sucesso")
  assert.strictEqual(res2.fromStatus, "bookmarked")
  assert.strictEqual(res2.toStatus, "applied")

  const history = getJobTransitionHistory(testJobId)
  assert.strictEqual(history.length, 2, "Devem ser registrados 2 eventos de auditoria")
  assert.strictEqual(history[0].toStatus, "applied")
  assert.strictEqual(history[0].actor, "agent")
  assert.strictEqual(history[1].toStatus, "bookmarked")
  assert.strictEqual(history[1].actor, "user")
  console.log("✓ Teste 4: Transição de Status & Audit Trail passou com sucesso")

  // Test 5: Transição em Lote (Bulk)
  const bulkRes = transitionJobsInBulk([testJobId], "archived", "user", "Arquivado em lote")
  assert.strictEqual(bulkRes.updatedCount, 1, "Uma vaga deve ser atualizada em lote")

  const updatedHistory = getJobTransitionHistory(testJobId)
  assert.strictEqual(updatedHistory[0].toStatus, "archived")
  assert.strictEqual(updatedHistory[0].notes, "Arquivado em lote")
  console.log("✓ Teste 5: Transição em Lote (Bulk) passou com sucesso")

  console.log("\n🎉 TODOS OS TESTES DO JOBNAVIGATOR PASSARAM COM SUCESSO!")
}

runJobNavigatorTests()
