import type { CanonicalJob } from "../../types/canonical-job";
import type { RawJobInput } from "../../canonical/normalizer";
import { normalizeJob } from "../../canonical/normalizer";
import type {
  JobSourceAdapter,
  RawJob,
  RawJobReference,
  SearchOptions,
  SourceHealth,
} from "../base";

export type MockRawJob = {
  jobId: string;
  portal: string;
  positionTitle: string;
  employer: string;
  cityState?: string;
  isHomeOffice?: boolean;
  descriptionText: string;
  payRange?: string;
  postedDate?: string;
  link: string;
};

export class MockJobAdapter implements JobSourceAdapter<MockRawJob> {
  readonly name = "mock";
  readonly source = "mock";

  async discover(options: SearchOptions): Promise<RawJobReference[]> {
    const rawJobs = await this.fetch(options);
    return rawJobs.map((raw) => {
      const parsed = this.parse(raw);
      return {
        source: parsed.source,
        sourceJobId: parsed.sourceJobId,
        url: parsed.canonicalUrl ?? parsed.sourceUrl,
        title: parsed.title,
        company: parsed.companyName,
      };
    });
  }

  async fetchJob(reference: RawJobReference): Promise<RawJob> {
    return {
      source: reference.source,
      sourceJobId: reference.sourceJobId,
      sourceUrl: reference.url,
      canonicalUrl: reference.url,
      companyName: reference.company ?? "TechCorp",
      title: reference.title ?? "Senior TypeScript Engineer",
      descriptionRaw: "Mocked full details for candidate review.",
    };
  }

  async fetch(options: SearchOptions): Promise<MockRawJob[]> {
    const q = options.query.toLowerCase();
    const mockData: MockRawJob[] = [
      {
        jobId: "mock-101",
        portal: "mock-portal",
        positionTitle: "Senior TypeScript Engineer (Remote)",
        employer: "TechCorp",
        cityState: "São Paulo, SP, Brazil",
        isHomeOffice: true,
        descriptionText: "We are seeking a Senior TypeScript engineer to build robust distributed architectures.",
        payRange: "R$ 15.000 - R$ 22.000",
        postedDate: new Date().toISOString(),
        link: "https://example.com/jobs/mock-101",
      },
      {
        jobId: "mock-102",
        portal: "mock-portal",
        positionTitle: "Fullstack Developer (Next.js)",
        employer: "DevStudio",
        cityState: "Copenhagen, Denmark",
        isHomeOffice: false,
        descriptionText: "Join our vibrant office team in Copenhagen working on modern Next.js applications.",
        payRange: "DKK 55.000 - DKK 70.000",
        postedDate: new Date().toISOString(),
        link: "https://example.com/jobs/mock-102",
      },
    ];

    return mockData.filter(
      (job) =>
        job.positionTitle.toLowerCase().includes(q) ||
        job.descriptionText.toLowerCase().includes(q) ||
        job.employer.toLowerCase().includes(q)
    );
  }

  parse(raw: MockRawJob): RawJobInput {
    return {
      id: `mock-${raw.jobId}`,
      source: raw.portal,
      sourceJobId: raw.jobId,
      sourceUrl: raw.link,
      canonicalUrl: raw.link,
      companyName: raw.employer,
      title: raw.positionTitle,
      descriptionRaw: raw.descriptionText,
      locationRaw: raw.cityState,
      workplaceTypeRaw: raw.isHomeOffice ? "remote" : "onsite",
      salaryRaw: raw.payRange,
      publishedAt: raw.postedDate,
    };
  }

  normalize(rawInput: RawJobInput): CanonicalJob {
    return normalizeJob(rawInput);
  }

  async healthCheck(): Promise<SourceHealth> {
    return {
      source: this.source,
      healthy: true,
      circuitState: "closed",
      consecutiveFailures: 0,
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatencyMs: 0,
      },
    };
  }

  async search(options: SearchOptions): Promise<CanonicalJob[]> {
    const rawJobs = await this.fetch(options);
    return rawJobs.map((raw) => this.normalize(this.parse(raw)));
  }
}
