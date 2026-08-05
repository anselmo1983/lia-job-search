import type { CanonicalJob } from "../../types/canonical-job";
import type { RawJobInput } from "../../canonical/normalizer";
import { normalizeJob } from "../../canonical/normalizer";
import type { JobSourceAdapter, SearchOptions } from "../base";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export type JobSpyRawJob = {
  id?: string;
  site?: string;
  job_url?: string;
  job_url_direct?: string;
  title?: string;
  company?: string;
  location?: string;
  date_posted?: string;
  job_type?: string;
  min_amount?: number;
  max_amount?: number;
  currency?: string;
  is_remote?: boolean;
  description?: string;
  skills?: string[];
  benefits?: string[];
  [key: string]: unknown;
};

export class JobSpyAdapter implements JobSourceAdapter<JobSpyRawJob> {
  readonly name = "jobspy";

  async fetch(options: SearchOptions): Promise<JobSpyRawJob[]> {
    const limit = options.limit ?? 10;
    const query = options.query.replace(/"/g, '\\"');
    const location = (options.location ?? "").replace(/"/g, '\\"');

    // Run JobSpy Python CLI one-liner if python3 & python-jobspy are available
    const pythonScript = `
import json, sys
try:
    from jobspy import scrape_jobs
    jobs = scrape_jobs(
        site_name=["linkedin", "indeed", "glassdoor"],
        search_term="${query}",
        location="${location}",
        results_wanted=${limit},
        country_indeed='brazil' if 'brasil' in "${location}".lower() or 'brazil' in "${location}".lower() else 'usa'
    )
    if jobs is not None and not jobs.empty:
        print(jobs.to_json(orient='records', date_format='iso'))
    else:
        print("[]")
except Exception as e:
    print("[]", file=sys.stderr)
    print("[]")
`;

    try {
      const { stdout } = await execAsync(`python3 -c "${pythonScript.replace(/\n/g, " ")}"`);
      const parsed = JSON.parse(stdout.trim());
      if (Array.isArray(parsed)) return parsed as JobSpyRawJob[];
      return [];
    } catch {
      // Fallback: Return empty array gracefully if Python/JobSpy isn't installed in environment
      return [];
    }
  }

  parse(raw: JobSpyRawJob): RawJobInput {
    const source = raw.site ? `jobspy:${raw.site.toLowerCase()}` : "jobspy";
    const sourceUrl = raw.job_url_direct || raw.job_url || `https://jobspy.internal/job/${raw.id ?? Math.random()}`;
    const canonicalUrl = raw.job_url_direct || raw.job_url || sourceUrl;

    let salaryRaw: string | undefined;
    if (raw.min_amount || raw.max_amount) {
      salaryRaw = `${raw.currency ?? ""} ${raw.min_amount ?? 0} - ${raw.max_amount ?? 0}`.trim();
    }

    return {
      id: raw.id ? `jobspy-${raw.id}` : undefined,
      source,
      sourceJobId: raw.id ? String(raw.id) : undefined,
      sourceUrl,
      canonicalUrl,
      companyName: raw.company || "Unknown Company",
      title: raw.title || "Untitled Position",
      descriptionRaw: raw.description || "",
      locationRaw: raw.location,
      workplaceTypeRaw: raw.is_remote ? "remote" : undefined,
      employmentTypeRaw: raw.job_type,
      salaryRaw,
      skills: raw.skills,
      benefits: raw.benefits,
      publishedAt: raw.date_posted,
      metadata: {
        rawSite: raw.site,
        jobUrlDirect: raw.job_url_direct,
      },
    };
  }

  normalize(rawInput: RawJobInput): CanonicalJob {
    return normalizeJob(rawInput);
  }

  async search(options: SearchOptions): Promise<CanonicalJob[]> {
    const rawJobs = await this.fetch(options);
    return rawJobs.map((raw) => this.normalize(this.parse(raw)));
  }
}
