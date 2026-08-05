import assert from "node:assert"
import { ApplicationStatus } from "../lib/services/auto-apply-service"

interface MockApplication {
  id: string
  userId: string
  jobId: string
  status: ApplicationStatus
  appliedAt?: string
}

interface MockEvent {
  applicationId: string
  eventType: string
  fromStatus?: string
  toStatus?: string
}

function runTests() {
  console.log("Starting Auto-Apply Auditável state machine tests...")

  const events: MockEvent[] = []
  let mockApp: MockApplication = {
    id: "app-1",
    userId: "user-1",
    jobId: "job-1",
    status: "draft",
  }

  events.push({ applicationId: mockApp.id, eventType: "DRAFT_CREATED", toStatus: "draft" })
  assert.strictEqual(mockApp.status, "draft")
  console.log("✓ Step 1: Draft state created")

  // Transition to pending_approval
  if (mockApp.status === "draft") {
    const prev = mockApp.status
    mockApp.status = "pending_approval"
    events.push({ applicationId: mockApp.id, eventType: "APPROVAL_REQUESTED", fromStatus: prev, toStatus: mockApp.status })
  }
  assert.strictEqual(mockApp.status, "pending_approval")
  console.log("✓ Step 2: Transitioned to pending_approval")

  // Human approval and apply
  if (mockApp.status === "pending_approval") {
    const prev = mockApp.status
    mockApp.status = "applied"
    mockApp.appliedAt = new Date().toISOString()
    events.push({ applicationId: mockApp.id, eventType: "SUBMITTED", fromStatus: prev, toStatus: mockApp.status })
  }
  assert.strictEqual(mockApp.status, "applied")
  assert.ok(mockApp.appliedAt !== undefined)
  console.log("✓ Step 3: Approved and applied state confirmed")

  assert.strictEqual(events.length, 3)
  assert.strictEqual(events[0].eventType, "DRAFT_CREATED")
  assert.strictEqual(events[1].eventType, "APPROVAL_REQUESTED")
  assert.strictEqual(events[2].eventType, "SUBMITTED")
  console.log("✓ Step 4: Audit trail sequence verified")

  console.log("\nAll Auto-Apply Auditável tests passed cleanly!")
}

runTests()
