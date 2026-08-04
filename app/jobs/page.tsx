"use client"

import { useState, useEffect } from "react"
import { ExternalLink, Search, Radar, Loader2, Star, Sparkles, Filter } from "lucide-react"
import { PageHeader } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import JobApplyModal from "@/components/job-apply-modal"

type Job = {
  id: string
  key?: string
  title: string
  company: string
  location: string
  url: string
  description?: string
  status: string
  fit: string
  score: number | null
  date?: string
}

const PRESET_QUERIES = [
  "Desenvolvedor React",
  "Engenheiro de Dados",
  "Python Backend",
  "Full Stack Remote",
  "Tech Lead",
  "DevOps Engineer",
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

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchLocation, setSearchLocation] = useState("Brasil")
  const [scraping, setScraping] = useState(false)
  const [ranking, setRanking] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showApply, setShowApply] = useState(false)
  const [searchResults, setSearchResults] = useState<Job[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
    setLoading(true)
    try {
      const res = await fetch("/api/jobs")
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function scrapeJobs(customQuery?: string) {
    const q = customQuery ?? searchQuery ?? "desenvolvedor"
    if (customQuery) setSearchQuery(customQuery)
    setScraping(true)
    setSearchResults([])
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q || "desenvolvedor", location: searchLocation }),
      })
      const data = await res.json()
      if (data.results) {
        setSearchResults(data.results)
        for (const job of data.results) {
          await fetch("/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add", ...job }),
          })
        }
        await loadJobs()
      }
    } catch (err) {
      console.error(err)
    }
    setScraping(false)
  }

  async function rankJobs() {
    setRanking(true)
    try {
      await fetch("/api/jobs/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs }),
      })
      await loadJobs()
    } catch (err) {
      console.error(err)
    }
    setRanking(false)
  }

  const allJobs = [...jobs]
  const displayJobs = searchResults.length > 0 ? searchResults : allJobs
  const filteredDisplay = displayJobs.filter((job) => {
    if (statusFilter === "ranked" && job.score === null) return false
    if (statusFilter === "unranked" && job.score !== null) return false
    if (statusFilter === "strong" && (job.score ?? 0) < 70) return false

    if (!searchLocation.trim()) return true
    if (!job.location) return true
    const loc = job.location.toLowerCase()
    const target = searchLocation.toLowerCase()
    if (target.includes("brasil") || target.includes("brazil")) {
      return (
        loc.includes("brasil") ||
        loc.includes("brazil") ||
        loc.includes("br") ||
        loc.includes("remote") ||
        loc.includes("remoto") ||
        loc.includes("home office") ||
        loc.includes("paulo") ||
        loc.includes("rio")
      )
    }
    return loc.includes(target) || loc.includes("remote") || loc.includes("remoto")
  })

  const sorted = [...filteredDisplay].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  const unrankedCount = jobs.filter((j) => j.score === null).length

  return (
    <>
      <PageHeader title="Vagas" description="Busque, classifique por fit e gere candidatura para vagas no Brasil e remoto." />
      
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="w-full flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-400 sm:w-auto"
            placeholder="Ex: desenvolvedor React, data science"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") scrapeJobs()
            }}
          />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-400 sm:w-40"
            placeholder="Local"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
          />
          <Button onClick={() => scrapeJobs()} disabled={scraping}>
            {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            {scraping ? "Buscando..." : "Buscar Vagas"}
          </Button>
        </div>

        {/* Quick presets */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Busca rápida:</span>
          {PRESET_QUERIES.map((preset) => (
            <button
              key={preset}
              onClick={() => scrapeJobs(preset)}
              disabled={scraping}
              className="rounded-full bg-slate-950 border border-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:border-emerald-400/50 hover:text-emerald-300 transition"
            >
              + {preset}
            </button>
          ))}
        </div>

        {/* Action bar & Filters */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-1 rounded-md transition ${statusFilter === "all" ? "bg-slate-800 text-white font-medium" : "text-slate-400"}`}
              >
                Todas ({jobs.length})
              </button>
              <button
                onClick={() => setStatusFilter("strong")}
                className={`px-2.5 py-1 rounded-md transition ${statusFilter === "strong" ? "bg-emerald-400/20 text-emerald-300 font-medium" : "text-slate-400"}`}
              >
                Alta Compatibilidade (70+)
              </button>
              <button
                onClick={() => setStatusFilter("unranked")}
                className={`px-2.5 py-1 rounded-md transition ${statusFilter === "unranked" ? "bg-slate-800 text-white font-medium" : "text-slate-400"}`}
              >
                Sem Score ({unrankedCount})
              </button>
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={rankJobs} disabled={ranking || jobs.length === 0}>
            {ranking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4 text-amber-400" />}
            {ranking ? "Classificando com IA..." : `Classificar por Fit (${unrankedCount} pendentes)`}
          </Button>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
          <Search className="mx-auto mb-4 h-10 w-10 text-slate-600" />
          <h2 className="font-semibold text-white">Nenhuma vaga encontrada</h2>
          <p className="mt-2 text-sm text-slate-400">Use a busca ou os atalhos acima para pesquisar em múltiplos portais.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((job) => {
            const fitBadge = formatFitBadge(job.fit, job.score)
            return (
              <div key={job.id || job.key} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">{job.title}</h2>
                      {job.score !== null && (
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-400 text-xs font-bold text-slate-950">
                          {job.score}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${fitBadge.style}`}>
                        {fitBadge.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {job.company} · {job.location || "Local não informado"}
                    </p>
                    {job.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{job.description}</p>}
                    {job.date && <p className="mt-2 text-xs text-slate-500">Publicado em: {job.date}</p>}
                  </div>
                  <div className="flex items-start gap-2 shrink-0">
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg p-2.5 text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition"
                        title="Abrir anúncio original"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedJob(job)
                        setShowApply(true)
                      }}
                      className="gap-1.5 bg-emerald-400 text-slate-950 hover:bg-emerald-300 font-medium"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Aplicar (/apply)</span>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
