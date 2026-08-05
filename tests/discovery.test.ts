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

  console.log("\nAll Discovery Multi-Source tests passed cleanly!")
}

runTests()
