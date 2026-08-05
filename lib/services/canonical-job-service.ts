import type { CanonicalJob } from "../types/canonical-job";
import type { JobSourceAdapter, SearchOptions } from "../adapters/base";
import { isDuplicateJob, mergeJobProvenance } from "../canonical/fingerprint";
import { JobSpyAdapter } from "../adapters/jobspy/jobspy-adapter";
import { MockJobAdapter } from "../adapters/mock/mock-adapter";

export class CanonicalJobService {
  private static instance: CanonicalJobService;
  private adapters: Map<string, JobSourceAdapter> = new Map();
  private store: Map<string, CanonicalJob> = new Map();

  private constructor() {
    // Register default adapters
    this.registerAdapter(new JobSpyAdapter());
    this.registerAdapter(new MockJobAdapter());
  }

  public static getInstance(): CanonicalJobService {
    if (!CanonicalJobService.instance) {
      CanonicalJobService.instance = new CanonicalJobService();
    }
    return CanonicalJobService.instance;
  }

  public registerAdapter(adapter: JobSourceAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  public getAdapterNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  public ingest(jobs: CanonicalJob[]): CanonicalJob[] {
    const processed: CanonicalJob[] = [];

    for (const job of jobs) {
      let matchedId: string | undefined;

      for (const [id, existing] of this.store.entries()) {
        if (isDuplicateJob(existing, job)) {
          matchedId = id;
          break;
        }
      }

      if (matchedId) {
        const existing = this.store.get(matchedId)!;
        const merged = mergeJobProvenance(existing, job);
        this.store.set(matchedId, merged);
        processed.push(merged);
      } else {
        this.store.set(job.id, job);
        processed.push(job);
      }
    }

    return processed;
  }

  public async searchAndIngest(options: SearchOptions, targetAdapters?: string[]): Promise<CanonicalJob[]> {
    const activeAdapters = Array.from(this.adapters.values()).filter(
      (adapter) => !targetAdapters || targetAdapters.includes(adapter.name)
    );

    const results = await Promise.allSettled(
      activeAdapters.map((adapter) => adapter.search(options))
    );

    const rawCanonicalJobs: CanonicalJob[] = [];
    for (const res of results) {
      if (res.status === "fulfilled") {
        rawCanonicalJobs.push(...res.value);
      }
    }

    return this.ingest(rawCanonicalJobs);
  }

  public listJobs(filters?: {
    query?: string;
    workplaceType?: string;
    source?: string;
    limit?: number;
  }): CanonicalJob[] {
    let jobs = Array.from(this.store.values());

    if (filters?.query) {
      const q = filters.query.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.name.toLowerCase().includes(q) ||
          j.descriptionRaw.toLowerCase().includes(q)
      );
    }

    if (filters?.workplaceType) {
      jobs = jobs.filter((j) => j.workplaceType === filters.workplaceType);
    }

    if (filters?.source) {
      jobs = jobs.filter((j) => j.source.toLowerCase().includes(filters.source!.toLowerCase()));
    }

    if (filters?.limit) {
      jobs = jobs.slice(0, filters.limit);
    }

    return jobs;
  }

  public getJobById(id: string): CanonicalJob | undefined {
    return this.store.get(id);
  }

  public clearStore(): void {
    this.store.clear();
  }
}

export const canonicalJobService = CanonicalJobService.getInstance();
