export type JobSource = string;

export type WorkplaceType = "remote" | "hybrid" | "onsite" | "unknown";

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "freelance"
  | "internship"
  | "temporary"
  | "other";

export type CompanyReference = {
  id?: string;
  name: string;
  url?: string;
  logoUrl?: string;
  domain?: string;
};

export type JobLocation = {
  city?: string;
  state?: string;
  country?: string;
  rawLocation?: string;
  isRemote?: boolean;
};

export type SalaryRange = {
  currency?: string;
  min?: number;
  max?: number;
  period?: "hourly" | "monthly" | "yearly";
  textRaw?: string;
};

export type JobRequirements = {
  skills?: string[];
  experienceLevel?: string;
  educationLevel?: string;
  languages?: string[];
  rawText?: string;
};

export type ProvenanceRecord = {
  source: JobSource;
  discoveredAt: string;
  sourceJobId?: string;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
};

export type JobFingerprints = {
  urlHash: string;
  contentHash?: string;
  semanticHash?: string;
};

export type CanonicalJob = {
  id: string;
  source: JobSource;
  sourceJobId?: string;
  sourceUrl: string;
  canonicalUrl: string;
  company: CompanyReference;
  title: string;
  normalizedTitle?: string;
  descriptionRaw: string;
  descriptionNormalized?: string;
  locations: JobLocation[];
  workplaceType?: WorkplaceType;
  employmentType?: EmploymentType;
  salary?: SalaryRange;
  requirements: JobRequirements;
  benefits?: string[];
  publishedAt?: string;
  discoveredAt: string;
  enrichedAt?: string;
  expiresAt?: string;
  fingerprints: JobFingerprints;
  provenance: ProvenanceRecord[];
};
