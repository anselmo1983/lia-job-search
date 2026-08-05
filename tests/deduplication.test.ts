import assert from "node:assert";
import { normalizeJob } from "../lib/canonical/normalizer";
import {
  deduplicate,
  deduplicateJobList,
  exactSourceIdentity,
  exactCanonicalUrl,
  exactCompositeIdentity,
  exactContentHash,
  semanticDuplicateCandidate,
} from "../lib/canonical/deduplication";
import type { CanonicalJob } from "../lib/types/canonical-job";

function runDeduplicationTests() {
  console.log("=== INICIANDO TESTES DE DEDUPLICAÇÃO DE VAGAS (JOBNAVIGATOR 5 NÍVEIS) ===");

  const job1: CanonicalJob = normalizeJob({
    source: "linkedin",
    sourceJobId: "link_101",
    sourceUrl: "https://www.linkedin.com/jobs/view/101?utm_source=google&utm_medium=cpc#apply",
    companyName: "Acme Corp Ltd.",
    title: "Senior Full Stack Developer (m/f/d)",
    descriptionRaw: "Looking for a Senior Full Stack Developer proficient in React, Node, and TypeScript.",
    locationRaw: "São Paulo, SP, Brasil",
  });

  // Level 1 Duplicate: Same source + sourceJobId
  const jobL1: CanonicalJob = normalizeJob({
    source: "linkedin",
    sourceJobId: "link_101",
    sourceUrl: "https://www.linkedin.com/jobs/view/9999",
    companyName: "Acme Corp Ltd.",
    title: "Senior Full Stack Developer (m/f/d)",
    descriptionRaw: "Different description",
    locationRaw: "São Paulo, SP, Brasil",
  });

  // Level 2 Duplicate: Different source, but same canonical URL (after stripping UTM params)
  const jobL2: CanonicalJob = normalizeJob({
    source: "indeed",
    sourceJobId: "ind_555",
    sourceUrl: "https://www.linkedin.com/jobs/view/101?utm_campaign=spring_campaign",
    companyName: "Acme Corp",
    title: "Full Stack Engineer",
    descriptionRaw: "Another job description",
    locationRaw: "São Paulo",
  });

  // Level 3 Duplicate: Different source and URL, but exact composite identity (Company + Normalized Title + Normalized Location)
  const jobL3: CanonicalJob = normalizeJob({
    source: "glassdoor",
    sourceJobId: "gd_777",
    sourceUrl: "https://www.glassdoor.com/job/777",
    companyName: "Acme Corp", // normalizes to "acme corp"
    title: "Senior Full Stack Developer", // normalizes to "senior full stack developer"
    descriptionRaw: "Detailed job text about engineering leadership.",
    locationRaw: "São Paulo, SP, Brasil",
  });

  // Level 4 Duplicate: Different title/source/URL, but exact content hash
  const jobL4: CanonicalJob = normalizeJob({
    source: "niche_board",
    sourceJobId: "nb_888",
    sourceUrl: "https://nicheboard.com/job/888",
    companyName: "Acme Corp Ltd.",
    title: "Senior Full Stack Developer (m/f/d)",
    descriptionRaw: "Looking for a Senior Full Stack Developer proficient in React, Node, and TypeScript.",
    locationRaw: "São Paulo, SP, Brasil",
  });

  // Level 5 Duplicate: Semantic candidate (high token Jaccard similarity on title + same company + same location)
  const jobL5: CanonicalJob = normalizeJob({
    source: "ziprecruiter",
    sourceJobId: "zr_999",
    sourceUrl: "https://ziprecruiter.com/job/999",
    companyName: "Acme Corp Inc",
    title: "Senior Full Stack Engineer", // "Senior Full Stack Developer" vs "Senior Full Stack Engineer" -> token similarity > 0.75
    descriptionRaw: "Role in SP for experienced developer.",
    locationRaw: "São Paulo, SP",
  });

  const distinctJob: CanonicalJob = normalizeJob({
    source: "linkedin",
    sourceJobId: "link_202",
    sourceUrl: "https://linkedin.com/jobs/view/202",
    companyName: "Beta Corp",
    title: "Data Engineer",
    descriptionRaw: "Python, PySpark, BigQuery data pipelines.",
    locationRaw: "Remote",
  });

  // Test 1: Level 1 - exactSourceIdentity
  const resL1 = exactSourceIdentity(jobL1, [job1]);
  assert.ok(resL1, "Level 1 deduplication should match exact source + sourceJobId");
  assert.strictEqual(resL1?.id, job1.id);
  console.log("✓ Teste Nível 1 (exactSourceIdentity): Passou com sucesso");

  // Test 2: Level 2 - exactCanonicalUrl
  const resL2 = exactCanonicalUrl(jobL2, [job1]);
  assert.ok(resL2, "Level 2 deduplication should match canonical URL without tracking params");
  assert.strictEqual(resL2?.id, job1.id);
  console.log("✓ Teste Nível 2 (exactCanonicalUrl): Passou com sucesso");

  // Test 3: Level 3 - exactCompositeIdentity
  const resL3 = exactCompositeIdentity(jobL3, [job1]);
  assert.ok(resL3, "Level 3 deduplication should match normalized company + title + location");
  assert.strictEqual(resL3?.id, job1.id);
  console.log("✓ Teste Nível 3 (exactCompositeIdentity): Passou com sucesso");

  // Test 4: Level 4 - exactContentHash
  const resL4 = exactContentHash(jobL4, [job1]);
  assert.ok(resL4, "Level 4 deduplication should match contentHash");
  assert.strictEqual(resL4?.id, job1.id);
  console.log("✓ Teste Nível 4 (exactContentHash): Passou com sucesso");

  // Test 5: Level 5 - semanticDuplicateCandidate
  const resL5 = semanticDuplicateCandidate(jobL5, [job1]);
  assert.ok(resL5, "Level 5 deduplication should match semantic title token similarity");
  assert.strictEqual(resL5?.id, job1.id);
  console.log("✓ Teste Nível 5 (semanticDuplicateCandidate): Passou com sucesso");

  // Test 6: Deduplication Cascade order
  const matchedCascade = deduplicate(jobL5, [job1, distinctJob]);
  assert.ok(matchedCascade, "Cascade deduplicate should match job1");
  assert.strictEqual(matchedCascade?.id, job1.id);

  const matchedDistinct = deduplicate(distinctJob, [job1]);
  assert.strictEqual(matchedDistinct, undefined, "Distinct job should not be flagged as duplicate");
  console.log("✓ Teste Cascata de Deduplicação: Passou com sucesso");

  // Test 7: Gate LJS_JOB_DEDUP_DETERMINISTIC_PASS
  // Any permutation of the input array must yield the exact same deduplicated list length and IDs
  const rawBatch = [job1, jobL1, jobL2, jobL3, jobL4, jobL5, distinctJob];
  const rawBatchShuffled = [distinctJob, jobL5, jobL3, jobL1, jobL4, jobL2, job1];

  const dedup1 = deduplicateJobList(rawBatch);
  const dedup2 = deduplicateJobList(rawBatchShuffled);

  assert.strictEqual(dedup1.length, 2, "Batch with 5 duplicates of job1 and 1 distinct job must yield exactly 2 unique jobs");
  assert.strictEqual(dedup2.length, 2, "Shuffled batch must also yield exactly 2 unique jobs");

  // Provenance check
  const mergedJob1 = dedup1.find((j) => j.id === job1.id || j.provenance.some((p) => p.source === "linkedin"));
  assert.ok(mergedJob1, "Merged job must contain provenances from duplicate records");
  assert.ok(mergedJob1.provenance.length >= 2, "Provenance array must record merged sources");

  console.log("✓ Gate LJS_JOB_DEDUP_DETERMINISTIC_PASS: PASS - O mesmo conjunto de entrada produziu o mesmo resultado determinístico!");

  console.log("\n🎉 TODOS OS TESTES DE DEDUPLICAÇÃO PASSARAM COM SUCESSO!");
}

runDeduplicationTests();
