import { canonicalJobService } from "../services/canonical-job-service";
import type { RawJobInput } from "../canonical/normalizer";

export const canonicalJobMcpTools = {
  searchCanonicalJobs: {
    name: "search_canonical_jobs",
    description: "Search and ingest jobs from external portal adapters into CanonicalJob format.",
    parameters: {
      query: { type: "string", description: "Search keyword or role title" },
      location: { type: "string", description: "City, country, or remote preference" },
      source: { type: "string", description: "Optional specific source adapter name (e.g. jobspy, mock)" },
    },
    execute: async (args: { query: string; location?: string; source?: string }) => {
      const results = await canonicalJobService.searchAndIngest(
        { query: args.query, location: args.location },
        args.source ? [args.source] : undefined
      );
      return {
        count: results.length,
        jobs: results,
      };
    },
  },

  listCanonicalJobs: {
    name: "list_canonical_jobs",
    description: "List currently stored CanonicalJob records by query, source, or workplace type.",
    parameters: {
      query: { type: "string", description: "Filter by title or company" },
      source: { type: "string", description: "Filter by job source" },
      workplaceType: { type: "string", description: "Filter by remote, hybrid, onsite" },
    },
    execute: async (args: { query?: string; source?: string; workplaceType?: string }) => {
      const jobs = canonicalJobService.listJobs(args);
      return {
        count: jobs.length,
        jobs,
      };
    },
  },

  ingestRawJob: {
    name: "ingest_raw_job",
    description: "Ingest a raw job dictionary from any external source and normalize it into CanonicalJob.",
    parameters: {
      source: { type: "string" },
      title: { type: "string" },
      companyName: { type: "string" },
      sourceUrl: { type: "string" },
      descriptionRaw: { type: "string" },
      locationRaw: { type: "string" },
    },
    execute: async (args: RawJobInput) => {
      const [normalized] = canonicalJobService.ingest([
        canonicalJobService.getAdapterNames().length ? (await import("../canonical/normalizer")).normalizeJob(args) : (await import("../canonical/normalizer")).normalizeJob(args),
      ]);
      return {
        success: true,
        job: normalized,
      };
    },
  },
};
