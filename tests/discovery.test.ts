import assert from "node:assert"
import { canonicalJobUrl, generateJobHash } from "../lib/services/discovery-service"

function runTests() {
  console.log("Starting Discovery Multi-Source tests...")

  // Test 1: Canonical Job URL sanitization
  const trackingUrl = "https://www.linkedin.com/jobs/view/123456?utm_source=google&utm_medium=cpc&from=search#apply"
  const cleanUrl = canonicalJobUrl(trackingUrl)
  assert.strictEqual(cleanUrl, "https://www.linkedin.com/jobs/view/123456", "Tracking params and hash must be removed")
  console.log("✓ Test 1: Canonical Job URL sanitization passed")

  // Test 2: Content Hash Determinism
  const hash1 = generateJobHash("Senior Software Engineer", "TechCorp", "https://linkedin.com/jobs/view/100?utm_source=test")
  const hash2 = generateJobHash("senior software engineer  ", "TECHCORP ", "https://linkedin.com/jobs/view/100")
  assert.strictEqual(hash1, hash2, "Content hashes must be identical regardless of spacing/case or tracking params")
  console.log("✓ Test 2: Content Hash determinism and deduplication passed")

  // Test 3: Content Hash Differentiation
  const hash3 = generateJobHash("Frontend Engineer", "TechCorp", "https://linkedin.com/jobs/view/100")
  assert.notStrictEqual(hash1, hash3, "Different job titles must produce different hashes")
  console.log("✓ Test 3: Content Hash differentiation passed")

  // Test 4: CanonicalJob normalization and provenance structure
  const { normalizeJob } = require("../lib/canonical/normalizer")
  const canonical = normalizeJob({
    id: "test-101",
    source: "linkedin",
    sourceJobId: "101",
    sourceUrl: "https://linkedin.com/jobs/view/101",
    companyName: "Acme Corp",
    title: "Staff Engineer (m/f)",
    descriptionRaw: "Building high scale services with TypeScript and Go.",
    locationRaw: "São Paulo, SP, Remoto",
  })

  assert.strictEqual(canonical.title, "Staff Engineer (m/f)")
  assert.strictEqual(canonical.normalizedTitle, "Staff Engineer")
  assert.strictEqual(canonical.company.name, "Acme Corp")
  assert.strictEqual(canonical.locations[0].isRemote, true)
  assert.strictEqual(canonical.provenance.length, 1)
  assert.strictEqual(canonical.provenance[0].source, "linkedin")
  console.log("✓ Test 4: CanonicalJob normalization and provenance structure passed")

  console.log("\nAll Discovery Multi-Source tests passed cleanly!")
}

runTests()
