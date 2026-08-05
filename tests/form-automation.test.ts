import assert from "node:assert"
import { detectFormFields, autoFillFormSchema, findBestVaultAnswer } from "../lib/services/form-automation-service"
import { CandidateProfileSchema } from "../lib/db/profile-schema"

function runTests() {
  console.log("Starting CT220 Browser Automation tests...")

  const sampleFormHtml = `
    <form>
      <input name="applicant_name" placeholder="Full Name" type="text" required />
      <input name="applicant_email" placeholder="Email Address" type="email" required />
      <input name="applicant_phone" placeholder="Phone Number" type="tel" />
      <input name="linkedin_profile" placeholder="LinkedIn URL" type="url" />
      <textarea name="cover_letter_bio" placeholder="Tell us about yourself" maxlength="200"></textarea>
    </form>
  `

  const candidateProfile = CandidateProfileSchema.parse({
    identity: {
      fullName: "Anselmo Farias",
      email: "anselmo@example.com",
      phone: "+55 11 99999-8888",
      location: "São Paulo, SP",
      headline: "Senior Software Engineer",
      summary: "Engenheiro de Software com ampla experiência em sistemas distribuídos e IA.",
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
    skills: {
      primary: [],
      secondary: [],
      domains: [],
      tools: [],
    },
    experiences: [],
    education: [],
    certifications: [],
    applicationFacts: [
      {
        factKey: "Salário Pretendido",
        factValue: "R$ 18.000 / mês",
        verified: true,
      },
    ],
    answerVault: [
      {
        questionText: "Qual a sua motivação para trabalhar em IA?",
        answerText: "Construir sistemas autônomos de alto impacto com segurança e elegância.",
        category: "screener",
      },
    ],
    constraints: {
      noticePeriod: "2 semanas",
      workAuthorization: "Residente Brasil (CLT/PJ)",
    },
  })

  // Test 1: Detect Form Fields from HTML
  const fields = detectFormFields(sampleFormHtml)
  assert.strictEqual(fields.length, 5, "Should detect 5 form fields")
  assert.strictEqual(fields[0].name, "applicant_name")
  assert.strictEqual(fields[1].type, "email")
  assert.strictEqual(fields[4].maxLength, 200)
  console.log("✓ Test 1: HTML form field detection passed")

  // Test 2: Auto Fill Schema
  const filledSchema = autoFillFormSchema(fields, candidateProfile)
  assert.strictEqual(filledSchema[0].suggestedValue, "Anselmo Farias")
  assert.strictEqual(filledSchema[1].suggestedValue, "anselmo@example.com")
  assert.strictEqual(filledSchema[3].suggestedValue, "https://linkedin.com/in/anselmo")
  assert.ok(filledSchema[4].characterCount <= 200, "Bio should respect maxlength")
  console.log("✓ Test 2: Profile auto-fill mapping passed")

  // Test 3: findBestVaultAnswer Lookup
  const ansVault = findBestVaultAnswer("Qual a sua motivação para trabalhar em IA?", candidateProfile)
  assert.strictEqual(ansVault, "Construir sistemas autônomos de alto impacto com segurança e elegância.")

  const ansFact = findBestVaultAnswer("Qual o seu salário pretendido?", candidateProfile)
  assert.strictEqual(ansFact, "R$ 18.000 / mês")

  const ansNotice = findBestVaultAnswer("Qual o seu aviso prévio / disponibilidade?", candidateProfile)
  assert.strictEqual(ansNotice, "2 semanas")
  console.log("✓ Test 3: Application facts & Answer Vault lookup passed")

  // Test 4: Screener Questions Auto-Fill
  const screenerFields = [
    { id: "f1", name: "expected_salary", label: "Pretensão Salarial", type: "text" as const, required: true },
    { id: "f2", name: "motivacao", label: "Qual a sua motivação para trabalhar em IA?", type: "textarea" as const, required: true },
  ]

  const filledScreener = autoFillFormSchema(screenerFields, candidateProfile)
  assert.strictEqual(filledScreener[0].suggestedValue, "R$ 18.000 / mês")
  assert.strictEqual(filledScreener[1].suggestedValue, "Construir sistemas autônomos de alto impacto com segurança e elegância.")
  console.log("✓ Test 4: Screener questions auto-fill via Vault passed")

  console.log("\nAll CT220 Browser Automation tests passed cleanly!")
}

runTests()

