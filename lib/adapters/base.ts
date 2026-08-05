import type { CanonicalJob } from "../types/canonical-job";
import type { RawJobInput } from "../canonical/normalizer";

export interface SearchOptions {
  query: string;
  location?: string;
  limit?: number;
  offset?: number;
  remoteOnly?: boolean;
}

export interface RawJobReference {
  source: string;
  sourceJobId?: string;
  url: string;
  title?: string;
  company?: string;
  metadata?: Record<string, unknown>;
}

export type RawJob = RawJobInput;

export interface SourceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
}

export interface SourceHealth {
  source: string;
  healthy: boolean;
  circuitState: "closed" | "open" | "half_open";
  consecutiveFailures: number;
  lastExecutedAt?: string;
  lastError?: string;
  metrics: SourceMetrics;
}

export interface JobSourceAdapter<TRaw = unknown> {
  readonly name: string;
  readonly source: string;

  /**
   * Discovers raw job references for a query
   */
  discover(query: SearchOptions): Promise<RawJobReference[]>;

  /**
   * Fetches raw job details for a given reference
   */
  fetchJob(reference: RawJobReference): Promise<RawJob>;

  /**
   * Fetch raw response/data from external portal source
   */
  fetch(options: SearchOptions): Promise<TRaw[]>;

  /**
   * Parse raw payload into normalized RawJobInput format
   */
  parse(raw: TRaw): RawJobInput;

  /**
   * Normalize RawJobInput into domain CanonicalJob
   */
  normalize(rawInput: RawJobInput): CanonicalJob;

  /**
   * Health check status of the source adapter
   */
  healthCheck(): Promise<SourceHealth>;

  /**
   * Pipeline shortcut to fetch, parse, and normalize
   */
  search(options: SearchOptions): Promise<CanonicalJob[]>;
}
