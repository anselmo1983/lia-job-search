# Arquitetura Canônica — CT223 Lia Job Search

## Visão Geral
O **Lia Job Search (CT223)** é uma aplicação self-hosted desenvolvida em Next.js para gerenciamento de candidaturas, currículos e prospecção de vagas de trabalho.

```
                  INTERNET
                     │
                     ▼
┌───────────────────────────────────────────────┐
│ Cloudflare Access & Tunnel                    │
│ DNS + Autenticação no Edge (Allowlist Email)  │
└────────────────────┬──────────────────────────┘
                     │
                     ▼
┌───────────────────────────────────────────────┐
│ CT223 — Lia Job Search Container              │
│                                               │
│ Next.js Standalone (127.0.0.1:3000)           │
│ Better Auth (Server-side Session Guard)       │
│ SQLite Local (<LIA_DATA_DIR>/database/lia.db) │
│ Documents Privados (<LIA_DATA_DIR>/documents) │
└────────────────────┬──────────────────────────┘
                     │
                     ▼
┌───────────────────────────────────────────────┐
│ Backup Automatizado (tools/backup.sh)         │
│ Database Snapshot + SHA-256 Manifest           │
└───────────────────────────────────────────────┘
```

## Decisões Arquiteturais Principais
1. **Single Source of Truth**: Banco de dados SQLite local (`lia.db`) centraliza autenticação e entidades de domínio (`profile`, `resumes`, `jobs`, `applications`, `application_events`).
2. **Armazenamento Privado de PDFs**: PDFs salvos em `<LIA_DATA_DIR>/documents/<uuid>.pdf` com permissões `0600`, sem exposição em pasta `/public`.
3. **Autorização Server-Side**: Todas as rotas de API em `/api/*` validam a sessão com `requireSession()` no servidor.
