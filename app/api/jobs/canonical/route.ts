import { NextResponse } from "next/server";
import { canonicalJobService } from "@/lib/services/canonical-job-service";
import { normalizeJob, type RawJobInput } from "@/lib/canonical/normalizer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") ?? searchParams.get("query") ?? undefined;
    const location = searchParams.get("location") ?? undefined;
    const source = searchParams.get("source") ?? undefined;
    const workplaceType = searchParams.get("workplaceType") ?? undefined;
    const executeSearch = searchParams.get("search") === "true";

    if (executeSearch && query) {
      const results = await canonicalJobService.searchAndIngest(
        { query, location },
        source ? [source] : undefined
      );
      return NextResponse.json({
        success: true,
        count: results.length,
        jobs: results,
      });
    }

    const jobs = canonicalJobService.listJobs({
      query,
      source,
      workplaceType,
    });

    return NextResponse.json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    const canonicalJobs = items.map((item) => {
      if (item.fingerprints && item.canonicalUrl) {
        return item;
      }
      return normalizeJob(item as RawJobInput);
    });

    const ingested = canonicalJobService.ingest(canonicalJobs);

    return NextResponse.json({
      success: true,
      count: ingested.length,
      jobs: ingested,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
