import type { CanonicalJob } from "../types/canonical-job";
import { canonicalJobUrl } from "./normalizer";
import { mergeJobProvenance } from "./fingerprint";

/**
 * Normalizes strings by trimming, lowercasing, and collapsing whitespace.
 */
export function normalizeString(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^\w\s]/gi, " ") // replace punctuation with space
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes company names by removing legal entity suffixes.
 */
export function normalizeCompanyName(companyName: string): string {
  const norm = normalizeString(companyName);
  return norm
    .replace(/\b(inc|corp|corporation|llc|ltd|limited|sa|s\/a|ltda|gmbh|bv|ab)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes location strings.
 */
export function normalizeLocationString(job: CanonicalJob): string {
  const loc = job.locations[0];
  if (!loc) return "unknown";
  if (loc.isRemote) return "remote";
  const city = normalizeString(loc.city);
  const state = normalizeString(loc.state);
  const country = normalizeString(loc.country);
  const combined = [city, state, country].filter(Boolean).join(" ");
  return combined || normalizeString(loc.rawLocation) || "unknown";
}

/**
 * Computes Jaccard Similarity between two sets of word tokens.
 */
export function tokenJaccardSimilarity(textA: string, textB: string): number {
  const tokensA = new Set(normalizeString(textA).split(" ").filter((t) => t.length > 1));
  const tokensB = new Set(normalizeString(textB).split(" ").filter((t) => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Level 1: exactSourceIdentity
 * Matches job by exact source + sourceJobId.
 */
export function exactSourceIdentity(job: CanonicalJob, existingJobs: CanonicalJob[]): CanonicalJob | undefined {
  if (!job.sourceJobId) return undefined;
  const targetSource = job.source;
  const targetJobId = job.sourceJobId;

  return existingJobs.find((existing) => {
    if (existing.source === targetSource && existing.sourceJobId === targetJobId) {
      return true;
    }
    return existing.provenance.some(
      (p) => p.source === targetSource && p.sourceJobId === targetJobId
    );
  });
}

/**
 * Level 2: exactCanonicalUrl
 * Matches job by sanitized canonical URL / urlHash.
 */
export function exactCanonicalUrl(job: CanonicalJob, existingJobs: CanonicalJob[]): CanonicalJob | undefined {
  const targetCleanUrl = canonicalJobUrl(job.canonicalUrl || job.sourceUrl);
  if (!targetCleanUrl) return undefined;

  return existingJobs.find((existing) => {
    const existingCleanUrl = canonicalJobUrl(existing.canonicalUrl || existing.sourceUrl);
    if (existingCleanUrl && existingCleanUrl === targetCleanUrl) return true;
    if (job.fingerprints.urlHash && existing.fingerprints.urlHash === job.fingerprints.urlHash) return true;
    return false;
  });
}

/**
 * Level 3: exactCompositeIdentity
 * Matches job by company + normalized_title + normalized_location.
 */
export function exactCompositeIdentity(job: CanonicalJob, existingJobs: CanonicalJob[]): CanonicalJob | undefined {
  const normCompany = normalizeCompanyName(job.company.name);
  const normTitle = normalizeString(job.normalizedTitle || job.title);
  const normLocation = normalizeLocationString(job);

  if (!normCompany || !normTitle) return undefined;

  return existingJobs.find((existing) => {
    const exCompany = normalizeCompanyName(existing.company.name);
    const exTitle = normalizeString(existing.normalizedTitle || existing.title);
    const exLocation = normalizeLocationString(existing);

    return normCompany === exCompany && normTitle === exTitle && normLocation === exLocation;
  });
}

/**
 * Level 4: exactContentHash
 * Matches job by contentHash (hash of normalized title, company, description snippet).
 */
export function exactContentHash(job: CanonicalJob, existingJobs: CanonicalJob[]): CanonicalJob | undefined {
  if (!job.fingerprints.contentHash) return undefined;
  const targetHash = job.fingerprints.contentHash;

  return existingJobs.find((existing) => existing.fingerprints.contentHash === targetHash);
}

export function tokenOverlapCoefficient(textA: string, textB: string): number {
  const tokensA = new Set(normalizeString(textA).split(" ").filter((t) => t.length > 1));
  const tokensB = new Set(normalizeString(textB).split(" ").filter((t) => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const minSize = Math.min(tokensA.size, tokensB.size);
  return minSize === 0 ? 0 : intersection / minSize;
}

export function isLocationCompatible(locA: string, locB: string): boolean {
  if (locA === "unknown" || locB === "unknown") return true;
  if (locA === "remote" || locB === "remote") return locA === locB;
  if (locA.includes(locB) || locB.includes(locA)) return true;
  return tokenJaccardSimilarity(locA, locB) >= 0.4;
}

/**
 * Level 5: semanticDuplicateCandidate
 * Deterministic candidate matching via title token overlap & matching company/location.
 */
export function semanticDuplicateCandidate(job: CanonicalJob, existingJobs: CanonicalJob[]): CanonicalJob | undefined {
  const normCompany = normalizeCompanyName(job.company.name);
  const normLocation = normalizeLocationString(job);
  const jobTitle = job.normalizedTitle || job.title;

  if (!normCompany || !jobTitle) return undefined;

  return existingJobs.find((existing) => {
    const exCompany = normalizeCompanyName(existing.company.name);
    const exLocation = normalizeLocationString(existing);
    if (normCompany !== exCompany) return false;
    if (!isLocationCompatible(normLocation, exLocation)) {
      return false;
    }

    const exTitle = existing.normalizedTitle || existing.title;
    const overlap = tokenOverlapCoefficient(jobTitle, exTitle);
    const jaccard = tokenJaccardSimilarity(jobTitle, exTitle);
    const score = Math.max(overlap, jaccard);
    return score >= 0.70;
  });
}

/**
 * JobNavigator 5-Tier Fallback Cascade Deduplicator:
 * 1. exactSourceIdentity
 * 2. exactCanonicalUrl
 * 3. exactCompositeIdentity
 * 4. exactContentHash
 * 5. semanticDuplicateCandidate
 */
export function deduplicate(job: CanonicalJob, existingJobs: CanonicalJob[]): CanonicalJob | undefined {
  return (
    exactSourceIdentity(job, existingJobs) ??
    exactCanonicalUrl(job, existingJobs) ??
    exactCompositeIdentity(job, existingJobs) ??
    exactContentHash(job, existingJobs) ??
    semanticDuplicateCandidate(job, existingJobs)
  );
}

/**
 * Processes an array of CanonicalJob inputs deterministically, deduplicating
 * incoming jobs and merging provenance records when duplicates are found.
 * Guarantees `LJS_JOB_DEDUP_DETERMINISTIC_PASS`.
 */
export function deduplicateJobList(jobs: CanonicalJob[]): CanonicalJob[] {
  const deduplicated: CanonicalJob[] = [];

  for (const job of jobs) {
    const existingMatch = deduplicate(job, deduplicated);
    if (existingMatch) {
      const idx = deduplicated.findIndex((j) => j.id === existingMatch.id);
      if (idx !== -1) {
        deduplicated[idx] = mergeJobProvenance(deduplicated[idx], job);
      }
    } else {
      deduplicated.push(job);
    }
  }

  return deduplicated;
}
