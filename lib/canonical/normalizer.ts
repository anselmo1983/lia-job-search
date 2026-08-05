import type {
  CanonicalJob,
  EmploymentType,
  JobLocation,
  JobRequirements,
  SalaryRange,
  WorkplaceType,
} from "../types/canonical-job";
import { generateFingerprints } from "./fingerprint";

export type RawJobInput = {
  id?: string;
  source: string;
  sourceJobId?: string;
  sourceUrl: string;
  canonicalUrl?: string;
  companyName: string;
  companyUrl?: string;
  title: string;
  descriptionRaw: string;
  locationRaw?: string;
  workplaceTypeRaw?: string;
  employmentTypeRaw?: string;
  salaryRaw?: string;
  skills?: string[];
  benefits?: string[];
  publishedAt?: string;
  metadata?: Record<string, unknown>;
};

export function normalizeWorkplaceType(raw?: string): WorkplaceType {
  if (!raw) return "unknown";
  const lower = raw.toLowerCase();
  if (lower.includes("remote") || lower.includes("home office") || lower.includes("teletrabalho") || lower.includes("fjernarbejde")) {
    return "remote";
  }
  if (lower.includes("hybrid") || lower.includes("híbrido") || lower.includes("hibryd")) {
    return "hybrid";
  }
  if (lower.includes("onsite") || lower.includes("on-site") || lower.includes("presencial")) {
    return "onsite";
  }
  return "unknown";
}

export function normalizeEmploymentType(raw?: string): EmploymentType {
  if (!raw) return "other";
  const lower = raw.toLowerCase();
  if (lower.includes("full") || lower.includes("tempo integral") || lower.includes("fuldtid") || lower.includes("clt")) {
    return "full_time";
  }
  if (lower.includes("part") || lower.includes("meio período") || lower.includes("deltid")) {
    return "part_time";
  }
  if (lower.includes("contract") || lower.includes("pj") || lower.includes("contrato")) {
    return "contract";
  }
  if (lower.includes("freelance")) {
    return "freelance";
  }
  if (lower.includes("intern") || lower.includes("estágio") || lower.includes("praktik")) {
    return "internship";
  }
  if (lower.includes("temp") || lower.includes("temporário") || lower.includes("vikariat")) {
    return "temporary";
  }
  return "other";
}

export function normalizeLocation(locationRaw?: string): JobLocation[] {
  if (!locationRaw) return [{ isRemote: false }];
  const parts = locationRaw.split(",").map((s) => s.trim());
  const isRemote = normalizeWorkplaceType(locationRaw) === "remote";

  if (parts.length === 1) {
    return [{ city: parts[0], rawLocation: locationRaw, isRemote }];
  }
  if (parts.length >= 2) {
    return [
      {
        city: parts[0],
        state: parts[1],
        country: parts[2] ?? undefined,
        rawLocation: locationRaw,
        isRemote,
      },
    ];
  }
  return [{ rawLocation: locationRaw, isRemote }];
}

export function normalizeTitle(title: string): string {
  return title
    .replace(/\s*\(m\/f\/d\)/i, "")
    .replace(/\s*\(h\/m\/d\)/i, "")
    .replace(/\s*\(m\/f\)/i, "")
    .replace(/\s*-\s*remote/i, "")
    .replace(/\s*\/\s*remoto/i, "")
    .trim();
}

export function parseSalaryRange(raw?: string): SalaryRange | undefined {
  if (!raw) return undefined;
  const numbers = raw.match(/\d+[\d,.]*/g);
  if (!numbers) return { textRaw: raw };

  const parsedNumbers = numbers
    .map((n) => Number.parseFloat(n.replace(/\./g, "").replace(",", ".")))
    .filter((n) => !Number.isNaN(n));

  if (parsedNumbers.length === 0) return { textRaw: raw };

  const min = Math.min(...parsedNumbers);
  const max = Math.max(...parsedNumbers);

  let currency: string | undefined;
  if (raw.includes("R$") || raw.includes("BRL")) currency = "BRL";
  else if (raw.includes("$") || raw.includes("USD")) currency = "USD";
  else if (raw.includes("€") || raw.includes("EUR")) currency = "EUR";
  else if (raw.includes("DKK") || raw.includes("kr.")) currency = "DKK";

  return {
    currency,
    min,
    max: max > min ? max : min,
    textRaw: raw,
  };
}

export function normalizeJob(rawInput: RawJobInput): CanonicalJob {
  const discoveredAt = new Date().toISOString();
  const canonicalUrl = rawInput.canonicalUrl ?? rawInput.sourceUrl;
  const title = rawInput.title.trim();
  const normalizedTitle = normalizeTitle(title);
  const companyName = rawInput.companyName.trim();

  const fingerprints = generateFingerprints({
    canonicalUrl,
    title,
    companyName,
    locationRaw: rawInput.locationRaw,
    descriptionRaw: rawInput.descriptionRaw,
  });

  const id = rawInput.id ?? `${rawInput.source}-${fingerprints.urlHash.slice(0, 12)}`;

  const requirements: JobRequirements = {
    skills: rawInput.skills ?? [],
    rawText: rawInput.descriptionRaw.slice(0, 300),
  };

  return {
    id,
    source: rawInput.source,
    sourceJobId: rawInput.sourceJobId,
    sourceUrl: rawInput.sourceUrl,
    canonicalUrl,
    company: {
      name: companyName,
      url: rawInput.companyUrl,
    },
    title,
    normalizedTitle,
    descriptionRaw: rawInput.descriptionRaw,
    locations: normalizeLocation(rawInput.locationRaw),
    workplaceType: normalizeWorkplaceType(rawInput.workplaceTypeRaw ?? rawInput.locationRaw),
    employmentType: normalizeEmploymentType(rawInput.employmentTypeRaw),
    salary: parseSalaryRange(rawInput.salaryRaw),
    requirements,
    benefits: rawInput.benefits ?? [],
    publishedAt: rawInput.publishedAt,
    discoveredAt,
    fingerprints,
    provenance: [
      {
        source: rawInput.source,
        discoveredAt,
        sourceJobId: rawInput.sourceJobId,
        sourceUrl: rawInput.sourceUrl,
        metadata: rawInput.metadata,
      },
    ],
  };
}

export function canonicalToLegacyJob(canonical: CanonicalJob) {
  const loc = canonical.locations[0];
  const locStr = loc ? [loc.city, loc.state, loc.country].filter(Boolean).join(", ") || loc.rawLocation || "Not specified" : "Not specified";
  return {
    key: canonical.id,
    title: canonical.title,
    company: canonical.company.name,
    location: locStr,
    url: canonical.canonicalUrl,
    status: "discovered",
    fit: "unrated",
    score: null,
    deadline: canonical.expiresAt ?? "",
  };
}

