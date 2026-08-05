#!/usr/bin/env node
/**
 * tools/validate-env.mjs — Pre-deploy environment variable validation.
 *
 * Usage:
 *   node tools/validate-env.mjs            # validates against current NODE_ENV
 *   node tools/validate-env.mjs production  # explicitly validate production config
 *   pnpm validate:env                      # via package.json script
 *
 * Exit codes:
 *   0 — all required variables present
 *   1 — one or more required variables missing
 */

// ── Env var definitions ──────────────────────────────────────────────────────

const ENV_VARS = [
  // ── Auth (required in production) ──
  {
    name: "GOOGLE_CLIENT_ID",
    required: true,
    description: "Google OAuth 2.0 Client ID",
    fix: "Google Cloud Console → Credentials → OAuth 2.0 Client ID",
  },
  {
    name: "GOOGLE_CLIENT_SECRET",
    required: true,
    description: "Google OAuth 2.0 Client Secret",
    fix: "Google Cloud Console → Credentials → OAuth 2.0 Client Secret",
  },
  // BETTER_AUTH_SECRET / AUTH_SECRET: at least one must be set.
  {
    name: "BETTER_AUTH_SECRET",
    required: true,
    description: "Session signing secret (>= 32 chars)",
    fix: "Generate with: openssl rand -base64 32",
  },
  {
    name: "AUTH_SECRET",
    required: true,
    description: "Alias for BETTER_AUTH_SECRET",
    fix: "Either BETTER_AUTH_SECRET or AUTH_SECRET must be set",
  },

  // ── Auth (optional) ──
  {
    name: "BETTER_AUTH_URL",
    required: false,
    description: "Public base URL for OAuth callbacks (auto-derived from VERCEL_URL if unset)",
  },
  {
    name: "LJS_AUTH_ALLOWED_EMAILS",
    required: false,
    description: "Comma-separated email allowlist (single-user mode)",
  },
  {
    name: "AUTH_ALLOWED_EMAIL",
    required: false,
    description: "Alias for LJS_AUTH_ALLOWED_EMAILS",
  },

  // ── Bifrost / AI (required for AI features) ──
  {
    name: "BIFROST_BASE_URL",
    required: false,
    description: "Bifrost (CT109) inference endpoint URL (AI features disabled if unset)",
  },
  {
    name: "BIFROST_VIRTUAL_KEY",
    required: false,
    description: "Bifrost virtual key for authentication (AI features disabled if unset)",
  },
  {
    name: "BIFROST_MODEL_DEFAULT",
    required: false,
    description: "Default AI model for inference",
  },
  {
    name: "BIFROST_MODEL_REVIEW",
    required: false,
    description: "AI model for review/second-pass tasks",
  },

  // ── Runtime ──
  {
    name: "LIA_DATA_DIR",
    required: false,
    description: "Persistent data directory (auto-derived in Vercel; defaults to ./data locally)",
  },

  // ── Build / informational ──
  {
    name: "APP_COMMIT",
    required: false,
    description: "Git commit/tag for build identification (exposed via /api/health)",
  },
]

/** Groups where at least one variable must be set. */
const REQUIRE_ONE_OF = [["BETTER_AUTH_SECRET", "AUTH_SECRET"]]

// ── Validation logic ─────────────────────────────────────────────────────────

function validate(envVars, mode) {
  const results = []
  const seen = new Set()

  for (const envVar of envVars) {
    if (seen.has(envVar.name)) continue
    seen.add(envVar.name)

    const raw = process.env[envVar.name]
    const value = (raw || "").trim()

    if (!value) {
      results.push({
        name: envVar.name,
        status: envVar.required ? "missing" : "empty",
        required: envVar.required,
        description: envVar.description,
        fix: envVar.fix,
      })
    } else {
      results.push({
        name: envVar.name,
        status: "ok",
        required: envVar.required,
        description: envVar.description,
      })
    }
  }

  // Enforce requireOneOf groups
  for (const group of REQUIRE_ONE_OF) {
    const anySet = group.some((name) => Boolean((process.env[name] || "").trim()))
    if (anySet) {
      const setter = group.find((name) => Boolean((process.env[name] || "").trim()))
      for (const name of group) {
        if (name === setter) continue
        const r = results.find((res) => res.name === name)
        if (r && r.status === "missing") {
          r.status = "empty"
          r.required = false
          r.fix = undefined
          r.description += ` (not needed — using ${setter})`
        }
      }
    } else {
      const existing = results.find((r) => r.name === group[0])
      if (existing && existing.status !== "ok") {
        existing.status = "missing"
        existing.required = true
        existing.fix = `At least one of ${group.join(" / ")} must be set. Generate with: openssl rand -base64 32`
      }
      for (const name of group.slice(1)) {
        const dup = results.find((r) => r.name === name)
        if (dup) {
          dup.status = "ok"
          dup.required = false
          dup.description += " (hidden — see " + group[0] + ")"
        }
      }
    }
  }

  return results
}

// ── Output formatting ────────────────────────────────────────────────────────

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
}

function formatResults(results, mode) {
  const lines = []

  lines.push("")
  lines.push(`${COLORS.bold}📋 Environment Variable Validation${COLORS.reset}`)
  lines.push(`${COLORS.dim}Mode: ${mode}${COLORS.reset}`)
  lines.push("")

  const missing = results.filter((r) => r.status === "missing")
  const empty = results.filter((r) => r.status === "empty")
  const ok = results.filter((r) => r.status === "ok")

  if (missing.length > 0) {
    lines.push(`${COLORS.red}❌ Missing required variables:${COLORS.reset}`)
    for (const r of missing) {
      lines.push(`   ${COLORS.red}• ${r.name}${COLORS.reset}  ${COLORS.dim}${r.description}${COLORS.reset}`)
      if (r.fix) {
        lines.push(`     ${COLORS.dim}→ ${r.fix}${COLORS.reset}`)
      }
    }
    lines.push("")
  }

  if (empty.length > 0) {
    lines.push(`${COLORS.yellow}⚠️  Optional variables not set:${COLORS.reset}`)
    for (const r of empty) {
      lines.push(`   ${COLORS.yellow}• ${r.name}${COLORS.reset}  ${COLORS.dim}${r.description}${COLORS.reset}`)
    }
    lines.push("")
  }

  if (ok.length > 0) {
    lines.push(`${COLORS.green}✅ Configured:${COLORS.reset}`)
    for (const r of ok) {
      const masked =
        r.name.includes("SECRET") || r.name.includes("KEY")
          ? `${COLORS.dim}(set)${COLORS.reset}`
          : `${COLORS.dim}${(process.env[r.name] || "").trim().slice(0, 40)}${COLORS.reset}`
      lines.push(`   ${COLORS.green}• ${r.name}${COLORS.reset}  ${masked}`)
    }
    lines.push("")
  }

  lines.push(`${COLORS.bold}─────────────────────────────────────────${COLORS.reset}`)
  if (missing.length === 0) {
    lines.push(`${COLORS.green}${COLORS.bold}✅ All required variables are configured.${COLORS.reset}`)
  } else {
    lines.push(
      `${COLORS.red}${COLORS.bold}❌ ${missing.length} required variable(s) missing. Deploy will fail.${COLORS.reset}`,
    )
  }
  if (empty.length > 0) {
    lines.push(`${COLORS.yellow}⚠️  ${empty.length} optional variable(s) not set (features may be degraded).${COLORS.reset}`)
  }
  lines.push("")

  return lines.join("\n")
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const mode = process.argv[2] || process.env.NODE_ENV || "development"

  const results = validate(ENV_VARS, mode)
  const output = formatResults(results, mode)
  process.stdout.write(output)

  const missingCount = results.filter((r) => r.status === "missing").length
  process.exit(missingCount > 0 ? 1 : 0)
}

main()
