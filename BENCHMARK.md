# Benchmark: LIA Job Search vs. Mercado

## Aplicações Similares Analisadas

| Aplicação | Tipo | Custo | Plataforma | Diferencial |
|-----------|------|-------|------------|-------------|
| **LIA Job Search** | Open Source + AI Agent | Grátis | Web UI + CLI | Agente AI integrado, currículo adaptativo, workflow completo |
| **Huntr** | SaaS | $19-49/mês | Web | Pipeline visual, extensões navegador |
| **Simplify.jobs** | SaaS | Grátis/$12/mês | Extensão Chrome | Preenchimento automático de formulários |
| **Teal** | SaaS | Grátis/$29/mês | Web + Extensão | ATS Insights, organização de busca |
| **Notion Job Tracker (template)** | Template | Grátis | Notion | Customizável, sem automação |
| **Jobscan** | SaaS | $49-99/mês | Web | Otimização ATS em tempo real |
| **CakeResume** | SaaS | Grátis/$19/mês | Web | Builder de currículo visual |

## Comparação de Funcionalidades

| Funcionalidade | LIA | Huntr | Simplify | Teal | Jobscan |
|----------------|:---:|:-----:|:--------:|:----:|:-------:|
| Dashboard de vagas | ✅ | ✅ | ✅ | ✅ | ❌ |
| Classificação por fit | ✅ | ❌ | ❌ | ❌ | ❌ |
| Currículo adaptativo AI | ✅ | ❌ | ❌ | ❌ | ✅ |
| Carta apresentação AI | ✅ | ❌ | ❌ | ❌ | ❌ |
| Revisão por 2º agente AI | ✅ | ❌ | ❌ | ❌ | ❌ |
| Verificação ATS | ✅ | ❌ | ❌ | ❌ | ✅ |
| PDF compilado (LaTeX) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Calendar/entrevistas | ✅ | ✅ | ❌ | ✅ | ❌ |
| Network tracker | ✅ | ❌ | ❌ | ❌ | ❌ |
| Task tracker | ✅ | ✅ | ❌ | ✅ | ❌ |
| Estatísticas | ✅ | ✅ | ❌ | ✅ | ❌ |
| Open Source | ✅ | ❌ | ❌ | ❌ | ❌ |
| Local/privado | ✅ | ❌ | ❌ | ❌ | ❌ |
| Agente AI autônomo | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fill-Ups automáticos | ✅ | ❌ | ❌ | ❌ | ❌ |

## Diferenciais Únicos do LIA

1. **Agente AI Integrado** — Claude Code analisa vagas, avalia fit, gera currículo e carta adaptados, revisa por segundo agente, compila PDF e verifica ATS
2. **Workflow completo em CLI + Web UI** — Comandos `/scrape`, `/rank`, `/apply`, `/interview`, `/outcome`
3. **100% privado e local** — Dados nunca saem do seu computador
4. **Open Source** — Sem lock-in, customizável
5. **LaTeX profissional** — Currículos e cartas em PDF de qualidade tipográfica
6. **Fill-Ups automáticos** — Agente entrega kits de candidatura prontos no dashboard

## Status Atual (100% Funcional)

### Web UI
- ✅ Dashboard com visão geral do workspace
- ✅ Vagas encontradas (de seen_jobs.json)
- ✅ Candidaturas (de job_search_tracker.csv)
- ✅ Documentos (cv, cover_letters, documents)
- ✅ Fill-Ups (vagas ranqueadas com score)
- ✅ Network Tracker (localStorage)
- ✅ Task Tracker (localStorage)
- ✅ Interview Calendar (localStorage)
- ✅ Resume Templates (lista de arquivos)
- ✅ Estatísticas com pipeline visual
- ✅ Workflows (documentação dos comandos)

### Workflow AI (via Claude Code)
- ✅ `/setup` — Configura perfil
- ✅ `/scrape` — Busca vagas em portais
- ✅ `/rank` — Classifica por aderência
- ✅ `/apply` — Prepara candidatura completa
- ✅ `/outcome` — Registra resultado
- ✅ `/interview` — Prepara entrevista
- ✅ `/upskill` — Analisa lacunas
- ✅ `/html-report` — Relatório HTML
