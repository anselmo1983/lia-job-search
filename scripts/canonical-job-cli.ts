#!/usr/bin/env npx tsx
import { canonicalJobService } from "../lib/services/canonical-job-service";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  if (command === "search") {
    const query = args[1] || "developer";
    const location = args[2] || "";
    console.log(`[CLI] Searching for "${query}" in "${location}" across registered adapters...`);
    
    const results = await canonicalJobService.searchAndIngest({ query, location });
    console.log(`[CLI] Found & ingested ${results.length} canonical jobs:\n`);
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (command === "list") {
    const query = args[1];
    const jobs = canonicalJobService.listJobs({ query });
    console.log(`[CLI] Stored Canonical Jobs (${jobs.length}):\n`);
    console.log(JSON.stringify(jobs, null, 2));
    return;
  }

  console.log(`
Usage:
  npx tsx scripts/canonical-job-cli.ts search <query> [location]
  npx tsx scripts/canonical-job-cli.ts list [query]
`);
}

main().catch((err) => {
  console.error("CLI error:", err);
  process.exit(1);
});
