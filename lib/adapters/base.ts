import type { CanonicalJob } from "../types/canonical-job";
import type { RawJobInput } from "../canonical/normalizer";

export interface SearchOptions {
  query: string;
  location?: string;
  limit?: number;
  offset?: number;
  remoteOnly?: boolean;
}

export interface JobSourceAdapter<TRaw = unknown> {
  readonly name: string;
  
  /**
   * Fetch raw response/data from the external portal source
   */
  fetch(options: SearchOptions): Promise<TRaw[]>;

  /**
   * Parse raw data payload into normalized RawJobInput format
   */
  parse(raw: TRaw): RawJobInput;

  /**
   * Normalize RawJobInput into domain CanonicalJob
   */
  normalize(rawInput: RawJobInput): CanonicalJob;

  /**
   * Pipeline shortcut to fetch, parse, and normalize
   */
  search(options: SearchOptions): Promise<CanonicalJob[]>;
}
