#!/usr/bin/env bun
// CLI for searching jobs on Indeed Brasil (br.indeed.com).
// Zero runtime dependencies — uses only built-in fetch.

const HELP = `indeed-br-cli — search jobs on Indeed Brasil

USAGE
  bun run src/cli.ts search -q "<query>" [flags]

FLAGS
  -q, --query <text>      Job title or keywords (required)
  -l, --location <text>    City or state (default: "Brasil")
  --limit <n>              Max results (default: 15)
  --days <n>               Posted within N days (default: 30)
  --format json|table|plain  Output format (default: json)
`;

interface Flags { _: string[]; [k: string]: string | boolean | string[] }
function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] };
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("-")) { (flags._ as string[]).push(a); continue; }
    const name = a.replace(/^-+/, "");
    const key = alias[name] ?? name;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("-")) { flags[key] = true; }
    else { flags[key] = next; i++; }
  }
  return flags;
}

function fmtDate(raw: string): string {
  const num = parseInt(raw);
  if (isNaN(num)) return new Date().toISOString().slice(0, 10);
  const d = new Date();
  d.setDate(d.getDate() - Math.min(num, 60));
  return d.toISOString().slice(0, 10);
}

function extractAll(html: string, pattern: RegExp, group: number): string[] {
  const results: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes('g') ? '' : 'g'));
  while ((m = re.exec(html)) !== null) results.push(m[group]);
  return results;
}

async function cmdSearch(query: string, location: string, limit: number, days: number, format: string) {
  const results: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  let start = 0;

  while (results.length < limit) {
    const url = `https://br.indeed.com/empregos?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&fromage=${days}&start=${start}`;
    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) break;
      html = await res.text();
    } catch {
      break;
    }

    // Split by job_seen_beacon to get individual job cards
    const parts = html.split('job_seen_beacon');
    if (parts.length <= 1) break;

    for (let i = 1; i < parts.length && results.length < limit; i++) {
      const card = parts[i];

      // Extract job key (data-jk)
      const jkMatch = card.match(/data-jk="([^"]+)"/);
      if (!jkMatch) continue;
      const jk = jkMatch[1];
      if (seen.has(jk)) continue;
      seen.add(jk);

      // Extract title from <span title="..."> inside jobTitle
      const titleMatch = card.match(/<span[^>]*title="([^"]+)"[^>]*>/);
      const title = titleMatch ? titleMatch[1].trim() : "Vaga sem título";

      // Extract company from data-testid="company-name"
      const companyMatch = card.match(/data-testid="company-name"[^>]*>([^<]+)</);
      const company = companyMatch ? companyMatch[1].trim() : "";

      // Extract location from data-testid="text-location"
      const locMatch = card.match(/data-testid="text-location"[^>]*>([^<]+)</);
      const location_text = locMatch ? locMatch[1].trim() : location;

      // Extract date
      const dateMatch = card.match(/data-testid="timing-attribute"[^>]*>([^<]+)</i);
      const dateRaw = dateMatch ? dateMatch[1].trim() : "";

      results.push({
        id: `indeed_${jk}`,
        title,
        company,
        location: location_text,
        url: `https://br.indeed.com/viewjob?jk=${jk}`,
        description: "",
        date: dateRaw ? fmtDate(dateRaw.replace(/[^0-9]/g, '')) : new Date().toISOString().slice(0, 10),
        source: "indeed-br",
      });
    }

    start += 10;
    if (parts.length <= 1 || parts.length - 1 < 10) break;
    await new Promise(r => setTimeout(r, 1500));
  }

  if (format === "json") {
    console.log(JSON.stringify({ results }, null, 2));
  } else if (format === "table") {
    console.log(`Encontradas ${results.length} vagas no Indeed Brasil:\n`);
    for (const j of results) {
      console.log(`  ${j.title} @ ${j.company || "(empresa)"} — ${j.location}`);
    }
  } else {
    for (const j of results) {
      console.log(`\n--- ${j.title} ---`);
      console.log(`Empresa: ${j.company || "N/A"}`);
      console.log(`Local: ${j.location}`);
      console.log(`Data: ${j.date}`);
      console.log(`URL: ${j.url}`);
    }
  }
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const cmd = (flags._ as string[])[0];

  if (cmd !== "search" || flags.help || flags.h) {
    console.log(HELP);
    process.exit(cmd && cmd !== "search" ? 1 : 0);
  }

  const query = typeof flags.query === "string" ? flags.query : "";
  const location = typeof flags.location === "string" ? flags.location : "Brasil";
  const limit = typeof flags.limit === "string" ? parseInt(flags.limit) : 15;
  const days = typeof flags.days === "string" ? parseInt(flags.days) : 30;
  const format = typeof flags.format === "string" ? flags.format : "json";

  if (!query) {
    console.error(JSON.stringify({ error: "Parâmetro -q/--query é obrigatório", code: "MISSING_QUERY" }));
    process.exit(1);
  }

  try {
    await cmdSearch(query, location, limit, days, format);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ error: msg, code: "SEARCH_FAILED" }));
    process.exit(1);
  }
}

await main();
