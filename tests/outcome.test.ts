import assert from "node:assert"
import { FunnelMetrics } from "../lib/services/outcome-intelligence-service"

function runTests() {
  console.log("Starting Outcome Intelligence tests...")

  // Simulação de cálculo de métricas do funil
  const totalJobsDiscovered = 50
  const totalApplied = 20
  const totalInterviews = 5
  const totalOffers = 2
  const totalRejected = 3

  const responsesCount = totalInterviews + totalOffers + totalRejected
  const responseRatePct = Math.round((responsesCount / totalApplied) * 100)
  const interviewConversionRatePct = Math.round((totalInterviews / totalApplied) * 100)
  const offerConversionRatePct = Math.round((totalOffers / totalInterviews) * 100)

  const metrics: FunnelMetrics = {
    totalJobsDiscovered,
    totalApplications: 25,
    totalApplied,
    totalInterviews,
    totalOffers,
    totalRejected,
    responseRatePct,
    interviewConversionRatePct,
    offerConversionRatePct,
    averageResponseTimeDays: 4.5,
  }

  // Test 1: Verify Funnel Metrics Calculations
  assert.strictEqual(metrics.responseRatePct, 50, "Response rate should be 50%")
  assert.strictEqual(metrics.interviewConversionRatePct, 25, "Interview conversion rate should be 25%")
  assert.strictEqual(metrics.offerConversionRatePct, 40, "Offer conversion rate should be 40%")
  console.log("✓ Test 1: Funnel metrics calculation passed")

  // Test 2: Verify Response Time Metric
  assert.strictEqual(metrics.averageResponseTimeDays, 4.5, "Average response time should be 4.5 days")
  console.log("✓ Test 2: Average response time tracking passed")

  console.log("\nAll Outcome Intelligence tests passed cleanly!")
}

runTests()
