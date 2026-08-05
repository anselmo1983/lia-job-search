# Source Map: Candidate Profile Canônico

- **Data de Análise:** 2026-08-05
- **Capacidade:** Candidate Profile Canônico (Single Source of Truth)

---

## 1. Referências Inspecionadas

| Repositório | URL | Branch | Commit SHA | Licença | Arquivos Estudados |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ai-job-search` | `https://github.com/MadsLorentzen/ai-job-search` | main | `f89728e52f078fc2a0f67f2fbefee3d94a0d3fbd` | MIT | `src/types/profile.ts` |
| `career-ops` | `https://github.com/santifer/career-ops` | main | `cf0d011067b27217ca05c546652fa362f5e028df` | MIT | `src/schema/candidate.ts` |
| `reactive-resume` | `https://github.com/amruthpillai/reactive-resume` | main | `36232b631d659969cbc4a7a680f3a8483023d1f3` | MIT | `packages/schema/src/resume/data.ts` |

---

## 2. Análise do Comportamento Observado

### Padrões Absorvidos
1. **Contrato Único e Estrito (JSON Resume / Zod Schema):**
   - De `reactive-resume`: Estruturação em seções fortemente tipadas (`basics`, `skills`, `work`, `education`, `certifications`, `projects`).
   - De `career-ops`: Metadados de preferências de carreira (`targetRoles`, `targetSectors`, `dealbreakers`, `commuteConstraints`).
2. **Sincronização Automática Multi-Formato:**
   - Manutenção de cópia sincronizada em Markdown (`CLAUDE.md` e `.claude/skills/job-application-assistant/01-candidate-profile.md`) para consumo por LLM/CLI e em SQLite (`profile` table) para o servidor Web UI.

### Padrões Rejeitados
- **Layout visual complexo em JSON:** Estilização de fontes/margens presas ao schema de dados (presente no `reactive-resume`). No LJS, o schema de perfil reflete **apenas** fatos da carreira e preferências, enquanto a estilização visual fica confinada a templates LaTeX isolados em `cv/`.

---

## 3. Mapeamento para o LJS

| Componente Referência | Equivalente LJS | Decisão | Raciocínio |
| :--- | :--- | :--- | :--- |
| `reactive-resume/packages/schema` | `lib/db/profile-schema.ts` | **EXTEND** | Expandir o `CandidateProfileSchema` Zod existente para incluir versionamento e snapshots de perfil. |
| `ai-job-search/profile.ts` | `lib/db/profile-sync.ts` | **KEEP + EXTEND** | Manter o sincronizador SQLite ➔ JSON ➔ Markdown e adicionar metadados de versão (`profile_version`). |
| `career-ops/candidate.ts` | `app/api/profile/route.ts` | **EXTEND** | Garantir que `/api/profile` processe e valide todos os sub-campos de preferências e restrições. |

---

## 4. Riscos de Licença, Segurança e Operação

- **Licença:** Todas as referências utilizadas possuem licença permissiva **MIT**. Nenhum código AGPL foi transplantado.
- **Segurança:** Dados sensíveis de perfil (e-mail, telefone, links) são restritos por autenticação no Better Auth e mantidos no SQLite local (`lia.db`).
- **Operação:** Migrações de schema na tabela `profile` são aditivas e 100% retrocompatíveis.
