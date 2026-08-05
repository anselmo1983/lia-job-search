---
framework_version: 1.0.0
---

# Agent Guidelines: AI Job Search

This workspace is structured to manage job search activities, scraper tools, CVs, cover letters, and interview preparation.

## Thin-Pointer Design (Single Source of Truth)

To prevent duplication and configuration drift across different AI agent frameworks (Claude Code, Google Antigravity, Codex, Cursor, Gemini CLI, etc.), this workspace uses a unified thin-pointer design. All agent runtimes should load the canonical specifications and candidate profiles from the files and directories below:

1. **Personal Candidate Profile:**
   - The candidate profile, contact details, education, and target preferences are defined in [CLAUDE.md](CLAUDE.md) and the individual profile methodology files under [.claude/skills/job-application-assistant/](.claude/skills/job-application-assistant/) (specifically `01-*.md` etc.).
2. **Canonical Workflow Specifications:**
   - The step-by-step instructions and triggers for tasks (setup, scrape, rank, apply, upskill, interview) are defined in the [.claude/](.claude/) directory (specifically under `.claude/skills/` and `.claude/commands/`).
   - Do not duplicate these rules or specifications. Treat `.claude/` files as the single source of truth.
3. **Portal Search Skills:**
   - Job-portal search CLIs live under [.agents/skills/](.agents/skills/) in the portable Agent Skills format (with a `SKILL.md` per portal). Codex and Antigravity discover these automatically; the `/scrape` workflow in [.claude/skills/job-scraper/](.claude/skills/job-scraper/) orchestrates them.

## Ponytail Ruleset (DietrichGebert/ponytail)

Channel a lazy senior developer (efficient, minimal, zero over-engineering). Apply the **Decision Ladder** on every change:
1. **YAGNI:** Does this need to exist at all? Skip unrequested features.
2. **Reuse:** Look before writing; reuse existing utils, types, and components in this codebase.
3. **Stdlib:** Use standard library capabilities first.
4. **Native platform:** Prefer native HTML/CSS/browser features (`<input type="date">`, CSS vs JS).
5. **Existing deps:** Use installed packages before adding new dependencies.
6. **One line:** If it can be one line, make it one line.
7. **Minimum diff:** Write only the minimal safe code that works.

