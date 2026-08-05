"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Sparkles, Radar, Star, Loader2, Search, ExternalLink, Filter, Zap, Globe, User, Upload } from "lucide-react"
import { PageHeader } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import JobApplyModal from "@/components/job-apply-modal"
import { fetchWithAuth } from "@/lib/auth/client-guard"

type Job = {
  key: string
  id: string
  title: string
  company: string
  location: string
  url: string
  status: string
  fit: string
  score: number | null
  source?: string
  deadline?: string
  description?: string
  strengths?: string[]
  gaps?: string[]
  reasoning?: string
}

const kitItems = [
  "Currículo ATS adaptado",
  "Carta de apresentação",
  "Simulação de entrevista",
  "Template de abordagem",
  "Orientação salarial",
]

function formatFitBadge(fit: string, score: number | null): { label: string; style: string } {
  const s = score ?? 0
  if (s >= 80) return { label: "Alta Compatibilidade", style: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" }
  if (s >= 60) return { label: "Média Compatibilidade", style: "bg-amber-400/15 text-amber-300 border-amber-400/30" }
  if (score !== null) return { label: "Baixa Compatibilidade", style: "bg-slate-800 text-slate-400 border-slate-700" }

  const f = (fit || "").toLowerCase()
  if (f === "strong fit" || f === "high" || f.includes("alta")) return { label: "Alta Compatibilidade", style: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" }
  if (f === "medium fit" || f.includes("média") || f.includes("media")) return { label: "Média Compatibilidade", style: "bg-amber-400/15 text-amber-300 border-amber-400/30" }
  if (f === "low fit" || f.includes("baixa")) return { label: "Baixa Compatibilidade", style: "bg-slate-800 text-slate-400 border-slate-700" }
  return { label: "Não Classificado", style: "bg-slate-800 text-slate-400 border-slate-700" }
}

export default function FillUpsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [ranking, setRanking] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showApply, setShowApply] = useState(false)
  const [minScore, setMinScore] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSource, setSelectedSource] = useState<string>("all")
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    loadJobs()
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const res = await fetchWithAuth("/api/profile")
      const data = await res.json()
      if (data.structured) setProfile(data.structured)
      else if (data.profile) {
        try {
          const parsed = JSON.parse(data.profile)
          setProfile(parsed)
        } catch {}
      }
    } catch {}
  }

  async function loadJobs() {
    setLoading(true)
    try {
      const res = await fetchWithAuth("/api/jobs")
      const data = await res.json()
      const rawJobs = data.jobs || []
      const mapped: Job[] = rawJobs.map((j: any, i: number) => ({
        key: String(j.key || j.id || i),
        id: String(j.id || j.key || i),
        title: String(j.title || "Vaga sem título"),
        company: String(j.company || "Empresa não informada"),
        location: String(j.location || "Local não informado"),
        url: String(j.url || j.link || ""),
        status: String(j.status || "discovered"),
        fit: String(j.fit || "unrated"),
        score: typeof j.rank_score === "number" ? j.rank_score : typeof j.score === "number" ? j.score : null,
        source: String(j.source || "Geral"),
        deadline: String(j.deadline || ""),
        description: String(j.description || ""),
        strengths: Array.isArray(j.strengths) ? j.strengths : [],
        gaps: Array.isArray(j.gaps) ? j.gaps : [],
        reasoning: String(j.reasoning || ""),
      }))
      setJobs(mapped)
    } catch (err) {
      console.error("Erro ao carregar vagas nos Fill-Ups:", err)
    }
    setLoading(false)
  }

  async function runScrape(customQuery?: string) {
    setScraping(true)
    try {
      const queryToUse = customQuery || searchQuery || profile?.role || (Array.isArray(profile?.skills?.primary) ? profile.skills.primary[0] : profile?.skills?.primary) || "desenvolvedor software"
      const locationToUse = profile?.location || "Brasil"
      const res = await fetchWithAuth("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryToUse, location: locationToUse }),
      })
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        for (const job of data.results) {
          await fetchWithAuth("/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add", ...job }),
          })
        }
      }
      // Ranquear automaticamente após buscar novas vagas
      await runRank()
      await loadJobs()
    } catch (err) {
      console.error("Erro ao executar scraper:", err)
    }
    setScraping(false)
  }

  async function runRank() {
    setRanking(true)
    try {
      await fetchWithAuth("/api/jobs/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs }),
      })
      await loadJobs()
    } catch (err) {
      console.error("Erro ao ranquear vagas:", err)
    }
    setRanking(false)
  }

  const rankedJobs = jobs.filter((job) => job.score !== null)
  const sortedJobs = [...rankedJobs].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  
  const sources = Array.from(new Set(jobs.map(j => j.source).filter(Boolean)))

  const filteredJobs = sortedJobs.filter((job) => {
    if ((job.score ?? 0) < minScore) return false
    if (selectedSource !== "all" && (job.source || "").toLowerCase() !== selectedSource.toLowerCase()) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const titleMatch = job.title.toLowerCase().includes(q)
      const companyMatch = job.company.toLowerCase().includes(q)
      const locMatch = job.location.toLowerCase().includes(q)
      if (!titleMatch && !companyMatch && !locMatch) return false
    }
    return true
  })

  const unrankedCount = jobs.filter((job) => job.score === null).length

  return (
    <>
      <PageHeader
        title="AI Job Search Fill-Ups"
        description="Seus melhores matches ranqueados por IA, prontos para gerar kits completos e avançar no pipeline de contratação."
      />

      {/* Candidate Profile Sync Banner */}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 backdrop-blur">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-400" />
              <h3 className="font-semibold text-slate-100">
                {profile?.name ? `Perfil de ${profile.name}` : "Busca Baseada no Seu Currículo"}
              </h3>
              {profile ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 font-medium">
                  Currículo Carregado
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 font-medium">
                  Sem currículo enviado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {profile?.role ? `Cargo Alvo: ${profile.role} • ` : ""}
              {profile?.skills?.primary ? `Skills Principais: ${Array.isArray(profile.skills.primary) ? profile.skills.primary.join(", ") : profile.skills.primary}` : "Envie seu currículo na aba de Configurações para que a IA busque vagas personalizadas exatamente para o seu perfil."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/settings">
              <Button variant="outline" size="sm" className="text-xs border-slate-700 text-slate-300">
                <Upload className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                {profile ? "Atualizar Currículo" : "Enviar Currículo"}
              </Button>
            </Link>
            <Button
              variant="default"
              size="sm"
              onClick={() => runScrape()}
              disabled={scraping}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
            >
              {scraping ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Radar className="h-3.5 w-3.5 mr-1.5" />}
              {scraping ? "Buscando e Ranqueando..." : "Buscar Vagas do Meu Perfil"}
            </Button>
          </div>
        </div>
      </section>

      {/* Header Actions & Filters */}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 border border-slate-800">
            <Search className="h-4 w-4 text-slate-500 shrink-0" />
            <input
              className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
              placeholder="Filtrar Fill-Ups por palavra-chave, cargo ou empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={runScrape} disabled={scraping}>
              {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4 text-emerald-400" />}
              {scraping ? "Buscando..." : "Buscar Novas Vagas (/scrape)"}
            </Button>
            <Button variant="secondary" size="sm" onClick={runRank} disabled={ranking || jobs.length === 0}>
              {ranking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4 text-amber-400" />}
              {ranking ? "Classificando..." : `Classificar por IA (${unrankedCount} pendentes)`}
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-1.5 border border-slate-800">
            <Filter className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-400 font-medium">Pontuação Mínima:</span>
            <select
              className="bg-transparent font-semibold text-emerald-300 outline-none cursor-pointer"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
            >
              <option value={0} className="bg-slate-900 text-slate-200">Todas as Pontuações ({sortedJobs.length})</option>
              <option value={80} className="bg-slate-900 text-emerald-400">80+ Excelente Compatibilidade</option>
              <option value={70} className="bg-slate-900 text-emerald-400">70+ Alta Compatibilidade</option>
              <option value={50} className="bg-slate-900 text-amber-400">50+ Recomendadas</option>
            </select>
          </div>

          {sources.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-1.5 border border-slate-800">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-400 font-medium">Portal / Fonte:</span>
              <select
                className="bg-transparent font-semibold text-slate-300 outline-none cursor-pointer"
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
              >
                <option value="all" className="bg-slate-900 text-slate-200">Todos os Portais</option>
                {sources.map((src) => (
                  <option key={src} value={src} className="bg-slate-900 text-slate-300">{src}</option>
                ))}
              </select>
            </div>
          )}

          {unrankedCount > 0 && (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 font-medium text-amber-400 border border-amber-500/20 ml-auto">
              {unrankedCount} vaga(s) aguardando ranqueamento
            </span>
          )}
        </div>
      </section>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-400">
            <Zap className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Seu primeiro Fill-Up está aguardando</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Busque e classifique vagas usando IA para popular esta caixa de entrada com os melhores matches para seu perfil.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={runScrape} disabled={scraping}>
              {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
              {scraping ? "Buscando..." : "Buscar Vagas (/scrape)"}
            </Button>
            {jobs.length > 0 && (
              <Button variant="secondary" onClick={runRank} disabled={ranking}>
                {ranking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                {ranking ? "Ranqueando..." : `Classificar ${jobs.length} vagas (/rank)`}
              </Button>
            )}
          </div>
          <p className="mt-4 text-xs font-mono text-emerald-400/80">Fluxo recomendado: /scrape → /rank → /apply</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filteredJobs.map((job) => {
            const fitBadge = formatFitBadge(job.fit, job.score)
            return (
              <article
                key={job.key}
                className="flex flex-col justify-between rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 p-6 shadow-lg transition hover:border-emerald-400/50"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-400/20">
                          <Sparkles className="h-3 w-3" /> Recomendado por IA
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${fitBadge.style}`}>
                          {fitBadge.label}
                        </span>
                      </div>
                      <h2 className="mt-2 text-xl font-bold text-white">{job.title}</h2>
                      <p className="text-sm text-slate-400">
                        {job.company} · {job.location} {job.source ? `· Via ${job.source}` : ""}
                      </p>
                    </div>
                    <div
                      className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-xl font-bold text-slate-950 shadow-md ${
                        (job.score ?? 0) >= 80
                          ? "bg-emerald-400"
                          : (job.score ?? 0) >= 60
                          ? "bg-amber-400"
                          : "bg-slate-300"
                      }`}
                    >
                      {job.score}
                    </div>
                  </div>

                  {job.reasoning && (
                    <p className="mt-4 text-xs italic text-slate-400 border-l-2 border-emerald-400/40 pl-3">
                      "{job.reasoning}"
                    </p>
                  )}

                  {/* Kit Inclusion list */}
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {kitItems.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-800/80 pt-4">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedJob(job)
                      setShowApply(true)
                    }}
                    className="gap-2 bg-emerald-400 text-slate-950 hover:bg-emerald-300 font-semibold"
                  >
                    <span>Gerar Kit & Aplicar (/apply)</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-300 transition"
                    >
                      <span>Ver vaga</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Info Banner */}
      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-white">Kits de candidatura gerados sob demanda</h2>
            <p className="mt-1 text-sm text-slate-400">
              Selecione um match acima e clique em <strong>Gerar Kit & Aplicar</strong>. O workflow utiliza seu perfil verificado para gerar currículo ATS adaptado e carta de apresentação sem inventar experiências.
            </p>
          </div>
        </div>
      </section>

      {/* Apply Modal */}
      {showApply && selectedJob && (
        <JobApplyModal
          job={selectedJob}
          onClose={() => {
            setShowApply(false)
            setSelectedJob(null)
          }}
          onComplete={() => loadJobs()}
        />
      )}
    </>
  )
}
