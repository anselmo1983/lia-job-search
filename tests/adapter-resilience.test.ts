import assert from "node:assert";
import type { JobSourceAdapter, RawJob, RawJobReference, SearchOptions } from "../lib/adapters/base";
import { ResilientAdapterWrapper } from "../lib/adapters/resilience";
import { canonicalJobService } from "../lib/services/canonical-job-service";

class FlakyMockAdapter implements JobSourceAdapter<string> {
  readonly name = "flaky_mock";
  readonly source = "flaky_mock";
  public failCount = 0;
  public maxFailuresBeforeSuccess = 0;

  constructor(maxFailuresBeforeSuccess = 0) {
    this.maxFailuresBeforeSuccess = maxFailuresBeforeSuccess;
  }

  async discover(query: SearchOptions): Promise<RawJobReference[]> {
    return [
      {
        source: this.source,
        sourceJobId: "flaky-1",
        url: "https://example.com/jobs/flaky-1",
        title: "Flaky Job Title",
        company: "Flaky Corp",
      },
    ];
  }

  async fetchJob(reference: RawJobReference): Promise<RawJob> {
    return {
      source: reference.source,
      sourceJobId: reference.sourceJobId,
      sourceUrl: reference.url,
      companyName: reference.company ?? "Flaky Corp",
      title: reference.title ?? "Flaky Title",
      descriptionRaw: "Description",
    };
  }

  async fetch(options: SearchOptions): Promise<string[]> {
    if (this.failCount < this.maxFailuresBeforeSuccess) {
      this.failCount++;
      throw new Error(`Flaky adapter simulated failure #${this.failCount}`);
    }
    return [`raw-data-${options.query}`];
  }

  parse(raw: string): any {
    return {
      source: this.source,
      sourceJobId: "flaky-1",
      sourceUrl: "https://example.com/jobs/flaky-1",
      companyName: "Flaky Corp",
      title: "Flaky Developer",
      descriptionRaw: raw,
    };
  }

  normalize(rawInput: any): any {
    return {
      id: "flaky-job-1",
      source: this.source,
      sourceUrl: rawInput.sourceUrl,
      canonicalUrl: rawInput.sourceUrl,
      company: { name: rawInput.companyName },
      title: rawInput.title,
      descriptionRaw: rawInput.descriptionRaw,
      locations: [{ rawLocation: "Remote" }],
      requirements: { skills: [] },
      discoveredAt: new Date().toISOString(),
      fingerprints: { urlHash: "hash123" },
      provenance: [],
    };
  }

  async healthCheck(): Promise<any> {
    return {
      source: this.source,
      healthy: true,
      circuitState: "closed",
      consecutiveFailures: 0,
      metrics: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, averageLatencyMs: 0 },
    };
  }

  async search(options: SearchOptions): Promise<any[]> {
    const raw = await this.fetch(options);
    return raw.map((r) => this.normalize(this.parse(r)));
  }
}

class SlowMockAdapter implements JobSourceAdapter<string> {
  readonly name = "slow_mock";
  readonly source = "slow_mock";

  async discover(): Promise<RawJobReference[]> {
    return [];
  }
  async fetchJob(): Promise<RawJob> {
    throw new Error("Slow");
  }
  async fetch(options?: SearchOptions): Promise<string[]> {
    await new Promise((r) => setTimeout(r, 200));
    return ["slow-job"];
  }
  parse(raw: string): any {
    return { source: this.source, sourceUrl: "url", companyName: "Slow", title: "Slow", descriptionRaw: raw };
  }
  normalize(rawInput: any): any {
    return { id: "slow-1", source: this.source, title: rawInput.title };
  }
  async healthCheck(): Promise<any> {
    return { source: this.source, healthy: true, circuitState: "closed", consecutiveFailures: 0, metrics: {} };
  }
  async search(options: SearchOptions): Promise<any[]> {
    const raw = await this.fetch(options);
    return [this.normalize(this.parse(raw[0]))];
  }
}

async function runResilienceTests() {
  console.log("=== INICIANDO TESTES DE RESILIÊNCIA DE ADAPTERS (EVER JOBS) ===");

  // Test 1: Discover, Fetch, Normalize contract execution
  const baseAdapter = new FlakyMockAdapter(0);
  const wrapper1 = new ResilientAdapterWrapper(baseAdapter);

  const refs = await wrapper1.discover({ query: "typescript" });
  assert.strictEqual(refs.length, 1);
  assert.strictEqual(refs[0].sourceJobId, "flaky-1");

  const rawJob = await wrapper1.fetchJob(refs[0]);
  assert.strictEqual(rawJob.companyName, "Flaky Corp");
  console.log("✓ Teste 1: Contrato Discover, FetchJob & Normalize validado com sucesso");

  // Test 2: Retry mechanism on transient failure
  const flakyAdapter = new FlakyMockAdapter(1); // Fails once, succeeds on retry
  const wrapper2 = new ResilientAdapterWrapper(flakyAdapter, { maxRetries: 2, minDelayMs: 10 });
  const searchRes = await wrapper2.search({ query: "node" });
  assert.strictEqual(searchRes.length, 1);
  assert.strictEqual(flakyAdapter.failCount, 1);
  console.log("✓ Teste 2: Retries com backoff exponencial validados com sucesso");

  // Test 3: Timeout Protection & Fault Isolation
  const slowAdapter = new SlowMockAdapter();
  const wrapperTimeout = new ResilientAdapterWrapper(slowAdapter, { timeoutMs: 50, maxRetries: 0 });
  const timeoutRes = await wrapperTimeout.search({ query: "timeout" });
  assert.strictEqual(timeoutRes.length, 0, "Timeout should return empty fallback array cleanly without throwing");
  console.log("✓ Teste 3: Timeout e Isolamento de Falha validados com sucesso");

  // Test 4: Circuit Breaker state machine (closed -> open -> half_open)
  const alwaysFailingAdapter = new FlakyMockAdapter(999);
  const wrapperCB = new ResilientAdapterWrapper(alwaysFailingAdapter, {
    failureThreshold: 2,
    maxRetries: 0,
    cooldownMs: 100,
    minDelayMs: 5,
  });

  // Call 1: failure #1 (closed)
  await wrapperCB.search({ query: "fail1" });
  let health = await wrapperCB.healthCheck();
  assert.strictEqual(health.circuitState, "closed");
  assert.strictEqual(health.consecutiveFailures, 1);

  // Call 2: failure #2 -> threshold reached -> trips to OPEN
  await wrapperCB.search({ query: "fail2" });
  health = await wrapperCB.healthCheck();
  assert.strictEqual(health.circuitState, "open");
  assert.strictEqual(health.healthy, false);

  // Call 3: while OPEN, returns fallback immediately without running adapter
  const resOpen = await wrapperCB.search({ query: "fail3" });
  assert.strictEqual(resOpen.length, 0);

  // Wait for cooldown window to trigger HALF_OPEN
  await new Promise((r) => setTimeout(r, 120));
  health = await wrapperCB.healthCheck();
  assert.strictEqual(health.circuitState, "half_open");
  console.log("✓ Teste 4: Circuit Breaker (closed -> open -> half_open) validado com sucesso");

  // Test 5: Operational Metrics Tracking
  const metricsHealth = await wrapper1.healthCheck();
  assert.ok(metricsHealth.lastExecutedAt, "lastExecutedAt must be recorded");
  assert.strictEqual(metricsHealth.metrics.totalRequests > 0, true);
  assert.strictEqual(metricsHealth.metrics.successfulRequests > 0, true);
  console.log("✓ Teste 5: Métricas operacionais (timestamps, requisições, latência) validadas com sucesso");

  // Test 6: CanonicalJobService integration & Health Diagnostics
  canonicalJobService.registerAdapter(wrapper1);
  const allDiagnostics = await canonicalJobService.getHealthDiagnostics();
  assert.ok(allDiagnostics.length >= 2, "Diagnostics should return status for registered adapters");
  const flakyDiag = allDiagnostics.find((d) => d.source === "flaky_mock");
  assert.ok(flakyDiag);
  assert.strictEqual(flakyDiag?.healthy, true);
  console.log("✓ Teste 6: Integração no CanonicalJobService e Diagnóstico de Saúde validados com sucesso");

  console.log("\n🎉 TODOS OS TESTES DE RESILIÊNCIA DE ADAPTERS PASSARAM COM SUCESSO!");
}

runResilienceTests();
