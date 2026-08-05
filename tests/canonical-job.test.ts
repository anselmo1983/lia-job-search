import assert from "node:assert";
import { normalizeJob, canonicalToLegacyJob } from "../lib/canonical/normalizer";

import { generateFingerprints, isDuplicateJob, mergeJobProvenance } from "../lib/canonical/fingerprint";
import { JobSpyAdapter } from "../lib/adapters/jobspy/jobspy-adapter";
import { MockJobAdapter } from "../lib/adapters/mock/mock-adapter";
import { CanonicalJobService } from "../lib/services/canonical-job-service";


async function runCanonicalJobTests() {
  console.log("=== INICIANDO TESTES DO BENCHMARK EVER JOBS & CANONICAL JOB ===");

  // Test 1: Boundary normalization
  const canonical = normalizeJob({
    source: "linkedin",
    sourceJobId: "link-123",
    sourceUrl: "https://linkedin.com/jobs/view/123",
    companyName: "Acme Inc (m/f/d)",
    title: "Senior Backend Developer - Remote",
    descriptionRaw: "We need a Node.js & TypeScript expert.",
    locationRaw: "São Paulo, SP, Brazil",
    workplaceTypeRaw: "remote",
    salaryRaw: "BRL 12.000 - 18.000",
  });

  assert.ok(canonical.id, "ID deve ser gerado");
  assert.strictEqual(canonical.normalizedTitle, "Senior Backend Developer", "Título normalizado deve remover sufixos");
  assert.strictEqual(canonical.company.name, "Acme Inc (m/f/d)");
  assert.strictEqual(canonical.workplaceType, "remote");
  assert.strictEqual(canonical.salary?.currency, "BRL");
  assert.strictEqual(canonical.salary?.min, 12000);
  assert.strictEqual(canonical.salary?.max, 18000);
  assert.ok(canonical.fingerprints.urlHash, "urlHash deve ser preenchido");
  assert.ok(canonical.fingerprints.contentHash, "contentHash deve ser preenchido");
  assert.strictEqual(canonical.provenance.length, 1);
  console.log("✓ Teste 1: Normalização na entrada passou");

  // Test 2: Fingerprinting and Provenance merging
  const jobA = normalizeJob({
    source: "linkedin",
    sourceUrl: "https://example.com/job/1",
    companyName: "Acme",
    title: "Software Engineer",
    descriptionRaw: "Fullstack job description",
    locationRaw: "Remote",
  });

  const jobB = normalizeJob({
    source: "glassdoor",
    sourceUrl: "https://example.com/job/1",
    companyName: "Acme",
    title: "Software Engineer",
    descriptionRaw: "Fullstack job description from glassdoor",
    locationRaw: "Remote",
  });

  assert.strictEqual(isDuplicateJob(jobA, jobB), true, "Deveria identificar job duplicado pelo hash de URL");
  const merged = mergeJobProvenance(jobA, jobB);
  assert.strictEqual(merged.provenance.length, 2, "Proveniência acumulada deve ter 2 fontes");
  assert.deepStrictEqual(
    merged.provenance.map((p) => p.source),
    ["linkedin", "glassdoor"]
  );
  console.log("✓ Teste 2: Fingerprinting e mesclagem de proveniência passou");

  // Test 3: JobSpy Adapter Parsing
  const jobSpyAdapter = new JobSpyAdapter();
  const rawJobSpy = jobSpyAdapter.parse({
    id: "spy-999",
    site: "linkedin",
    job_url: "https://www.linkedin.com/jobs/view/999",
    title: "Data Engineer",
    company: "DataCo",
    location: "Austin, TX",
    is_remote: true,
    description: "Build BigQuery and PySpark pipelines.",
    min_amount: 100000,
    max_amount: 140000,
    currency: "USD",
  });

  const canonicalJobSpy = jobSpyAdapter.normalize(rawJobSpy);
  assert.strictEqual(canonicalJobSpy.source, "jobspy:linkedin");
  assert.strictEqual(canonicalJobSpy.title, "Data Engineer");
  assert.strictEqual(canonicalJobSpy.company.name, "DataCo");
  assert.strictEqual(canonicalJobSpy.workplaceType, "remote");
  assert.strictEqual(canonicalJobSpy.salary?.currency, "USD");
  console.log("✓ Teste 3: JobSpy Adapter passou");

  // Test 4: CanonicalJobService heterogeneous search
  const service = CanonicalJobService.getInstance();
  service.clearStore();
  const searchResults = await service.searchAndIngest({ query: "TypeScript" }, ["mock"]);
  assert.ok(searchResults.length > 0, "Deveria retornar resultados do mock adapter");
  assert.ok(searchResults[0].title.includes("TypeScript"));

  const listed = service.listJobs({ query: "TypeScript" });
  assert.ok(listed.length > 0, "Deveria listar jobs ingeridos");
  console.log("✓ Teste 4: CanonicalJobService e busca heterogênea passou");

  // Test 5: Legacy Job Mapper
  const legacyJob = canonicalToLegacyJob(canonical);
  assert.strictEqual(legacyJob.key, canonical.id);
  assert.strictEqual(legacyJob.title, canonical.title);
  assert.strictEqual(legacyJob.company, canonical.company.name);
  console.log("✓ Teste 5: Mapeamento para legado passou");

  // Test 6: MCP Tool Integration
  const { canonicalJobMcpTools } = await import("../lib/mcp/canonical-job-mcp");
  const mcpSearchResult = await canonicalJobMcpTools.searchCanonicalJobs.execute({ query: "TypeScript", source: "mock" });
  assert.ok(mcpSearchResult.count > 0, "MCP search tool deveria retornar resultados");
  console.log("✓ Teste 6: Ferramentas MCP passaram");

  console.log("=== TODOS OS TESTES PASSARAM COM SUCESSO! ===");
}

runCanonicalJobTests().catch((err) => {
  console.error("FALHA NOS TESTES:", err);
  process.exit(1);
});

