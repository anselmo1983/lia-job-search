import crypto from "node:crypto";
import type { CanonicalJob, JobFingerprints, ProvenanceRecord } from "../types/canonical-job";

export function createHash(input: string): string {
  return crypto.createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}

export function generateFingerprints(job: {
  canonicalUrl: string;
  title: string;
  companyName: string;
  locationRaw?: string;
  descriptionRaw?: string;
}): JobFingerprints {
  const urlHash = createHash(job.canonicalUrl);
  const contentInput = `${job.title}|${job.companyName}|${job.locationRaw ?? ""}`;
  const contentHash = createHash(contentInput);
  const semanticHash = job.descriptionRaw ? createHash(job.descriptionRaw.slice(0, 500)) : undefined;

  return {
    urlHash,
    contentHash,
    semanticHash,
  };
}

import { deduplicate } from "./deduplication";

export function isDuplicateJob(existing: CanonicalJob, incoming: CanonicalJob): boolean {
  return deduplicate(incoming, [existing]) !== undefined;
}

export function mergeJobProvenance(existing: CanonicalJob, incoming: CanonicalJob): CanonicalJob {
  const mergedProvenance: ProvenanceRecord[] = [...existing.provenance];

  for (const record of incoming.provenance) {
    const exists = mergedProvenance.some(
      (p) => p.source === record.source && p.sourceJobId === record.sourceJobId
    );
    if (!exists) {
      mergedProvenance.push(record);
    }
  }

  return {
    ...existing,
    enrichedAt: new Date().toISOString(),
    benefits: Array.from(new Set([...(existing.benefits ?? []), ...(incoming.benefits ?? [])])),
    provenance: mergedProvenance,
  };
}
