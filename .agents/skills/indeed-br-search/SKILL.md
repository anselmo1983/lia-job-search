---
name: indeed-br-search
version: 1.0.0
description: >
  Search job listings on Indeed Brasil (br.indeed.com). Use this for finding
  jobs in Brazil across all sectors and roles. The CLI scrapes public job
  search results from Indeed's Brazilian site.
context: fork
enabled: true
allowed-tools: Bash(bun run .agents/skills/indeed-br-search/cli/src/cli.ts *)
---

# Indeed Brasil Search Skill

Search live job listings from **Indeed Brasil** (br.indeed.com).  
No authentication or API key required.

## Commands

### Search job listings

```bash
bun run .agents/skills/indeed-br-search/cli/src/cli.ts search -q "<query>" -l "<location>" [flags]
```

Flags:
- `-q, --query <text>` — Job title, skill, or keywords
- `-l, --location <text>` — City, state, or "Brasil" (default: "Brasil")
- `--limit <n>` — Max results (default: 15)
- `--days <n>` — Posted within N days (default: 30)
- `--format json|table|plain` — Output format (default: json)

## Output format (JSON)

```json
{
  "results": [
    {
      "id": "indeed_abc123",
      "title": "Desenvolvedor Full Stack",
      "company": "Empresa XYZ",
      "location": "São Paulo, SP",
      "url": "https://br.indeed.com/...",
      "description": "...",
      "date": "2026-07-28",
      "source": "indeed-br"
    }
  ]
}
```

## Notes

- Data comes from public Indeed Brasil pages
- Respects robots.txt — personal use only
- Rate limiting: max 1 request per 3 seconds
