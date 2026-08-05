import type { CanonicalJob } from "../types/canonical-job";
import type { RawJobInput } from "../canonical/normalizer";
import type {
  JobSourceAdapter,
  RawJob,
  RawJobReference,
  SearchOptions,
  SourceHealth,
  SourceMetrics,
} from "./base";

export interface ResilienceConfig {
  timeoutMs?: number;
  maxRetries?: number;
  failureThreshold?: number;
  cooldownMs?: number;
  minDelayMs?: number;
}

export class ResilientAdapterWrapper<TRaw = unknown> implements JobSourceAdapter<TRaw> {
  private adapter: JobSourceAdapter<TRaw>;
  private config: Required<ResilienceConfig>;

  // Circuit Breaker State
  private circuitState: "closed" | "open" | "half_open" = "closed";
  private consecutiveFailures = 0;
  private lastStateChangeTimestamp = Date.now();

  // Rate Limiting
  private lastCallTimestamp = 0;

  // Operational Metrics
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private totalLatencyMs = 0;
  private lastExecutedAt?: string;
  private lastError?: string;

  constructor(adapter: JobSourceAdapter<TRaw>, config?: ResilienceConfig) {
    this.adapter = adapter;
    this.config = {
      timeoutMs: config?.timeoutMs ?? 10_000,
      maxRetries: config?.maxRetries ?? 2,
      failureThreshold: config?.failureThreshold ?? 3,
      cooldownMs: config?.cooldownMs ?? 30_000,
      minDelayMs: config?.minDelayMs ?? 100,
    };
  }

  get name(): string {
    return this.adapter.name;
  }

  get source(): string {
    return this.adapter.source ?? this.adapter.name;
  }

  private updateCircuitState(): void {
    const now = Date.now();
    if (
      this.circuitState === "open" &&
      now - this.lastStateChangeTimestamp >= this.config.cooldownMs
    ) {
      this.circuitState = "half_open";
      this.lastStateChangeTimestamp = now;
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallTimestamp;
    if (elapsed < this.config.minDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.config.minDelayMs - elapsed));
    }
    this.lastCallTimestamp = Date.now();
  }

  private async executeWithResilience<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    this.updateCircuitState();

    if (this.circuitState === "open") {
      this.lastError = `Circuit breaker is OPEN for source ${this.source}`;
      return fallback;
    }

    await this.enforceRateLimit();

    const startTime = Date.now();
    this.totalRequests++;
    this.lastExecutedAt = new Date().toISOString();

    let attempts = 0;
    while (attempts <= this.config.maxRetries) {
      attempts++;
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout of ${this.config.timeoutMs}ms exceeded`)),
            this.config.timeoutMs
          )
        );

        const result = await Promise.race([operation(), timeoutPromise]);

        // Success tracking
        const latency = Date.now() - startTime;
        this.totalLatencyMs += latency;
        this.successfulRequests++;
        this.consecutiveFailures = 0;

        if (this.circuitState === "half_open") {
          this.circuitState = "closed";
          this.lastStateChangeTimestamp = Date.now();
        }

        return result;
      } catch (err: any) {
        const isLastAttempt = attempts > this.config.maxRetries;
        if (!isLastAttempt) {
          const backoff = Math.pow(2, attempts - 1) * 300;
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        // Failure tracking
        const latency = Date.now() - startTime;
        this.totalLatencyMs += latency;
        this.failedRequests++;
        this.consecutiveFailures++;
        this.lastError = err?.message ?? String(err);

        if (this.consecutiveFailures >= this.config.failureThreshold) {
          this.circuitState = "open";
          this.lastStateChangeTimestamp = Date.now();
        }

        return fallback;
      }
    }

    return fallback;
  }

  async discover(query: SearchOptions): Promise<RawJobReference[]> {
    return this.executeWithResilience(async () => {
      if (this.adapter.discover) {
        return await this.adapter.discover(query);
      }
      const rawJobs = await this.adapter.fetch(query);
      return rawJobs.map((raw) => {
        const parsed = this.adapter.parse(raw);
        return {
          source: parsed.source,
          sourceJobId: parsed.sourceJobId,
          url: parsed.canonicalUrl ?? parsed.sourceUrl,
          title: parsed.title,
          company: parsed.companyName,
        };
      });
    }, []);
  }

  async fetchJob(reference: RawJobReference): Promise<RawJob> {
    return this.executeWithResilience(async () => {
      if (this.adapter.fetchJob) {
        return await this.adapter.fetchJob(reference);
      }
      return {
        source: reference.source,
        sourceJobId: reference.sourceJobId,
        sourceUrl: reference.url,
        canonicalUrl: reference.url,
        companyName: reference.company ?? "Unknown Company",
        title: reference.title ?? "Untitled",
        descriptionRaw: "",
      };
    }, {
      source: reference.source,
      sourceJobId: reference.sourceJobId,
      sourceUrl: reference.url,
      companyName: reference.company ?? "Unknown",
      title: reference.title ?? "Untitled",
      descriptionRaw: "",
    });
  }

  async fetch(options: SearchOptions): Promise<TRaw[]> {
    return this.executeWithResilience(() => this.adapter.fetch(options), []);
  }

  parse(raw: TRaw): RawJobInput {
    try {
      return this.adapter.parse(raw);
    } catch (err: any) {
      return {
        source: this.source,
        sourceUrl: "https://error.internal",
        companyName: "Error",
        title: "Error Parsing Job",
        descriptionRaw: err?.message ?? "Parse error",
      };
    }
  }

  normalize(rawInput: RawJobInput): CanonicalJob {
    return this.adapter.normalize(rawInput);
  }

  async search(options: SearchOptions): Promise<CanonicalJob[]> {
    return this.executeWithResilience(() => this.adapter.search(options), []);
  }

  async healthCheck(): Promise<SourceHealth> {
    this.updateCircuitState();
    let healthy = this.circuitState !== "open";

    if (healthy && this.adapter.healthCheck) {
      try {
        const subCheck = await this.adapter.healthCheck();
        healthy = subCheck.healthy;
      } catch {
        healthy = false;
      }
    }

    const averageLatencyMs =
      this.totalRequests > 0 ? Math.round(this.totalLatencyMs / this.totalRequests) : 0;

    const metrics: SourceMetrics = {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      averageLatencyMs,
    };

    return {
      source: this.source,
      healthy,
      circuitState: this.circuitState,
      consecutiveFailures: this.consecutiveFailures,
      lastExecutedAt: this.lastExecutedAt,
      lastError: this.lastError,
      metrics,
    };
  }
}
