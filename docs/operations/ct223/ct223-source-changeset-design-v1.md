# Lia Job Search — CT223 Source Changeset Design v1

## Status

- document_status: CANONICAL_CANDIDATE
- repository: anselmo1983/lia-job-search
- branch: feat/ct223-bifrost-deployment-v1
- base_commit: 0924e5a613b2a0bc462960029d1ba1033923bc6b
- target_runtime: CT223
- inference_authority: CT109 Bifrost
- orchestration_authority: CT112 Lia Core
- tools_authority: CT220 MCP Hub
- deployment_authority: PVE
- application_deployed: NO

## Product Objective

The purpose of Lia Job Search is not infrastructure completion.

Its operational objective is:

1. find valid job opportunities;
2. remove duplicates;
3. rank opportunities against the candidate profile;
4. improve the CV for qualified vacancies;
5. improve application material;
6. measure responses;
7. increase interviews.

North-star outcome:

```text
QUALIFIED_APPLICATION
        ↓
RESPONSE
        ↓
INTERVIEW
```

Infrastructure changes are justified only when they improve, protect,
measure, or enable this funnel.

## Current Functional Baseline

The audited application already contains:

- React Web UI;
- operational dashboard;
- job search APIs;
- ranking and application flows;
- profile handling;
- CV upload and extraction;
- Indeed Brasil search skill;
- vacancy batch workflow;
- Lia OS visual identity.

The application is therefore classified as:

```text
FUNCTIONAL_VERTICAL_PROTOTYPE_PENDING_CANONICAL_INTEGRATION
```

The project must not rebuild functioning UI or workflows without
evidence that replacement is necessary.

## Current Gaps

Repository audit identified:

- direct provider files: 8;
- browser credential files: 11;
- persistence-related files: 25;
- child-process files: 10;
- Dockerfile: absent;
- Compose definition: absent;
- Next.js standalone output: absent;
- CT109 Bifrost integration: absent.

## Architectural Authorities

### GitHub

Authority for:

- source code;
- branches;
- commits;
- pull requests;
- version history.

### PVE

Authority for:

- operational gates;
- validation;
- deployment;
- snapshots;
- rollback;
- CT lifecycle.

### CT223 — Lia Job Search

Authority for:

- Lia Job Search application runtime;
- job-search UI;
- job ingestion;
- candidate-facing workflow;
- application artifacts.

CT223 must not become an inference gateway or general tool executor.

### CT109 — Bifrost

Sole authority for:

- model providers;
- provider credentials;
- model aliases;
- routing;
- fallback;
- budgets;
- rate limits;
- inference observability.

The browser and CT223 application routes must not own provider secrets.

### CT112 — Lia Core

Future authority for:

- planning;
- orchestration;
- policy;
- approval;
- memory;
- decision logic.

CT112 is not required to validate the first real job opportunity.

### CT220 — MCP Hub

Future authority for:

- tools;
- controlled execution;
- browser automation;
- RBAC;
- tool audit.

CT220 is not required to validate the first real job opportunity.

## Immediate Product Milestone

The immediate milestone is:

```text
FIRST_VALIDATED_COMPATIBLE_JOB
```

Acceptance requires:

- real vacancy;
- valid source URL;
- vacancy still active;
- normalized job data;
- duplicate check completed;
- candidate profile loaded;
- matching executed;
- fit explanation produced;
- strengths identified;
- gaps identified;
- human validation performed.

CT112 orchestration, CT220 browser automation, and automatic job
submission are explicitly not prerequisites.

## Required Source Changes

### 1. Next.js Production Packaging

Modify:

- next.config.mjs

Required:

- preserve existing image behavior;
- enable standalone output;
- keep the current application architecture.

### 2. Container Packaging

Create:

- Dockerfile
- compose.yml
- .dockerignore
- .env.example

Requirements:

- multi-stage build;
- pinned Node major;
- pnpm 11.18.0;
- non-root application process;
- Next.js standalone runtime;
- Bun available for existing search skills;
- no secrets inside image layers.

### 3. Persistent Runtime Data

Canonical mapping:

```text
PVE/CT223:
/opt/lia-job-search/data

container:
/app/data

environment:
LIA_DATA_DIR=/app/data
```

Data that must not depend on the container image filesystem:

- CV uploads;
- extracted profile artifacts;
- tracker;
- application records;
- generated application artifacts.

### 4. Bifrost Adapter

Create:

```text
lib/inference/bifrost.ts
```

Environment contract:

```text
BIFROST_BASE_URL
BIFROST_VIRTUAL_KEY
BIFROST_MODEL_DEFAULT
BIFROST_MODEL_REVIEW
```

Rules:

- server-side only;
- OpenAI-compatible protocol;
- no OpenAI direct endpoint;
- no Anthropic direct endpoint;
- no Moonshot/Kimi direct inference endpoint;
- no provider key accepted from browser payload;
- application chooses aliases, not providers.

### 5. Browser Credential Removal

Remove browser authority over:

- API keys;
- provider selection;
- provider-specific model selection;
- localStorage provider credentials.

The UI may display:

- inference availability;
- configured application alias;
- Bifrost connectivity state.

It must not expose Bifrost virtual keys.

### 6. Job Search Skills

Preserve the existing skill architecture.

Bun remains a runtime dependency because current portal skills use it.

Requirements:

- fixed executable paths;
- argument arrays;
- no shell interpolation;
- timeouts;
- controlled error handling;
- .agents/skills included in the image.

No separate Bun API service will be created.

### 7. Batch Workflow

The current provider-native batch mechanism must not bypass Bifrost.

Initial policy:

- native direct Moonshot batch requests disabled;
- no replacement batch subsystem in this changeset;
- sequential controlled processing is acceptable for the first
  validated-job milestone.

### 8. Health Endpoint

Create:

```text
/api/health
```

It must report only non-sensitive operational state:

- application status;
- source/build commit;
- persistent data directory status;
- Bifrost reachability.

## Files Planned for Creation

- Dockerfile
- compose.yml
- .dockerignore
- .env.example
- lib/inference/bifrost.ts
- lib/runtime/data-directory.ts
- app/api/health/route.ts
- docs/operations/ct223/ct223-source-changeset-design-v1.md

## Files Planned for Modification

Minimum known set:

- next.config.mjs
- package.json
- app/settings/page.tsx
- app/api/apply/route.ts
- app/api/profile/extract/route.ts
- app/api/profile/upload-cv/route.ts
- app/api/scrape/route.ts
- app/api/batch/route.ts

Additional files identified during implementation must be justified
against the same architectural rules.

## Implementation Priority

### P0 — unblock first valid search

1. preserve and fix vacancy search;
2. package application reproducibly;
3. establish persistent profile/CV storage;
4. integrate inference through Bifrost;
5. remove browser provider credentials;
6. validate application build;
7. deploy CT223 internally;
8. load canonical candidate profile;
9. execute first controlled search.

### P1 — improve search quality

After the first end-to-end search:

- improve vacancy sources;
- improve normalization;
- improve deduplication;
- improve matching.

### P2 — improve conversion

After search quality is measurable:

- improve adapted CV;
- improve application generation;
- measure responses;
- measure interviews.

## Funnel Metrics

The future application record should support:

```text
source_jobs
unique_jobs
qualified_jobs
applications
responses
interviews
```

Useful derived metrics:

```text
deduplication_rate
qualification_rate
application_rate
response_rate
interview_rate
```

The primary product outcome is interview rate from qualified applications.

## Explicitly Out of Scope for This Changeset

- public Cloudflare exposure;
- automatic browser submission;
- CAPTCHA bypass;
- new database architecture;
- multi-user SaaS;
- CT112 advanced orchestration;
- CT220 browser execution;
- n8n workflow expansion;
- unrelated UI redesign.

## Gate Sequence

1. Source design staging.
2. Canonical design commit.
3. Minimal source implementation.
4. Static validation.
5. Next.js production build.
6. Docker image build.
7. CT109 inference validation.
8. Controlled CT223 deployment.
9. Candidate profile validation.
10. First real vacancy search.
11. First compatible vacancy validation.

## Source Evidence

Deployment gap plan:

```text
/root/p2p-93f-ct223-deployment-gap-plan-v1-2026-07-31-113843.md
sha256=e29ae0a6d8b9e6c51c6860f52f4be5e452362815f1223c48e991ab3578c65f76
```

Source changeset inventory:

```text
/root/p2p-93g-ct223-source-changeset-design-v1-2026-08-01-150743.md
sha256=d00410361f608e42e78c9dba770d7c222f18870cc3119e8934d2c41094e3aa6a
```

## Acceptance

This document is accepted for GitHub commit only when:

- remote branch still points to 0924e5a613b2a0bc462960029d1ba1033923bc6b;
- no application code has been changed by this gate;
- CT223 application remains undeployed;
- CT109 remains unchanged;
- document SHA256 is recorded in the PVE report.
