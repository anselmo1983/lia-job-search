"use client"

import { useState, useEffect } from "react"
import { ExternalLink, Search, Radar, Loader2, Star, Sparkles, Filter, Eye, CheckSquare, Square } from "lucide-react"
import { PageHeader } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import JobApplyModal from "@/components/job-apply-modal"
import { JobPreviewDrawer, JobPreviewData } from "@/components/jobs/job-preview-drawer"
import { BulkActionsToolbar } from "@/components/jobs/bulk-actions-toolbar"
import { fetchWithAuth } from "@/lib/auth/client-guard"

type Job = JobPreviewData & {
  key?: string
  work_mode?: string
}

const PRESET_QUERIES = [
  "Desenvolvedor React",
  "Engenheiro de Dados",
  "Python Backend",
  "Full Stack Remote",
  "Tech Lead",
  "DevOps Engineer",
]

function formatFitBadge(fit?: string, score?: number | null): { label: string; style: string } {
  const s = score ?? 0
  if (s >= 80) return { label: "Alta Compatibilidade", style: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" }
  if (s >= 60) return { label: "Média Compatibilidade", style: "bg-amber-400/15 text-amber-300 border-amber-400/30" }
  if (score !== null && score !== undefined) return { label: "Baixa Compatibilidade", style: "bg-slate-800 text-slate-400 border-slate-700" }

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

  // Drawer de Job Preview
  const [previewJob, setPreviewJob] = useState<Job | null>(null)
  const [showPreviewDrawer, setShowPreviewDrawer] = useState(false)

  // Modal de Aplicar
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showApply, setShowApply] = useState(false)

  // Seleção Múltipla (Bulk Actions)
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])

  const [searchResults, setSearchResults] = useState<Job[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [workModeFilter, setWorkModeFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"score" | "date">("score")
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
      setJobs(data.jobs || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function scrapeJobs(customQuery?: string) {
    const defaultQuery = profile?.role || (Array.isArray(profile?.skills?.primary) ? profile.skills.primary[0] : profile?.skills?.primary) || "desenvolvedor"
    const q = customQuery ?? (searchQuery.trim() ? searchQuery : defaultQuery)
    if (customQuery) setSearchQuery(customQuery)
    setScraping(true)
    setSearchResults([])
    try {
      const res = await fetchWithAuth("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, location: profile?.location || searchLocation }),
      })
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results)
        await fetchWithAuth("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "bulk_add", jobs: data.results }),
        })
        await rankJobs()
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
      await fetchWithAuth("/api/jobs/rank", {
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

  const toggleSelectJob = (id: string) => {
    setSelectedJobIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedJobIds.length === sorted.length) {
      setSelectedJobIds([])
    } else {
      setSelectedJobIds(sorted.map((j) => j.id))
    }
  }

  const allJobs = [...jobs]
  const displayJobs = searchResults.length > 0 ? searchResults : allJobs

  // Base filter (by search query, location, and work mode)
  const baseFiltered = displayJobs.filter((job) => {
    // 1. Text Search Filter (instant matching)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const titleMatch = (job.title || "").toLowerCase().includes(q)
      const companyMatch = (job.company || "").toLowerCase().includes(q)
      const descMatch = (job.description || "").toLowerCase().includes(q)
      if (!titleMatch && !companyMatch && !descMatch) return false
    }

    // 2. Work mode filter
    if (workModeFilter !== "all") {
      const mode = (job.work_mode || "").toLowerCase()
      const loc = (job.location || "").toLowerCase()
      if (workModeFilter === "remoto") {
        if (!mode.includes("remot") && !loc.includes("remot") && !loc.includes("home office")) return false
      } else if (workModeFilter === "hibrido") {
        if (!mode.includes("híbr") && !mode.includes("hibr") && !loc.includes("híbr") && !loc.includes("hibr")) return false
      } else if (workModeFilter === "presencial") {
        if (mode.includes("remot") || mode.includes("híbr") || mode.includes("hibr") || loc.includes("remot") || loc.includes("home office")) return false
      }
    }

    // 3. Location filter (permissive for Brazil / Remote / empty)
    if (!searchLocation.trim()) return true
    if (!job.location) return true
    const loc = job.location.toLowerCase()
    const target = searchLocation.toLowerCase()
    if (target.includes("brasil") || target.includes("brazil") || target === "br") {
      return true
    }
    return loc.includes(target) || loc.includes("remote") || loc.includes("remoto") || loc.includes("home office")
  })

  // Dynamic status counts based on baseFiltered jobs
  const totalBaseCount = baseFiltered.length
  const strongCount = baseFiltered.filter((j) => (j.score ?? 0) >= 70).length
  const unrankedCount = baseFiltered.filter((j) => j.score === null || j.score === undefined).length

  // Apply final status filter
  const filteredDisplay = baseFiltered.filter((job) => {
    if (statusFilter === "ranked" && (job.score === null || job.score === undefined)) return false
    if (statusFilter === "unranked" && (job.score !== null && job.score !== undefined)) return false
    if (statusFilter === "strong" && (job.score ?? 0) < 70) return false
    return true
  })

  const sorted = [...filteredDisplay].sort((a, b) => {
    if (sortBy === "date") {
      const dateA = new Date(a.date || 0).getTime()
      const dateB = new Date(b.date || 0).getTime()
      return dateB - dateA
    }
    return (b.score ?? -1) - (a.score ?? -1)
  })

  return (
    <>
      <PageHeader title="Vagas" description="Busque em múltiplos portais, analise o Score Report com preview interativo e execute ações em lote." />

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
              onClick={() => {
                setSearchQuery(preset)
                scrapeJobs(preset)
              }}
              disabled={scraping}
              className={`rounded-full bg-slate-950 border px-2.5 py-1 text-xs transition ${
                searchQuery.toLowerCase() === preset.toLowerCase()
                  ? "border-emerald-400 text-emerald-300 font-medium bg-emerald-950/30"
                  : "border-slate-800 text-slate-300 hover:border-emerald-400/50 hover:text-emerald-300"
              }`}
            >
              + {preset}
            </button>
          ))}
          {searchQuery.trim() && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-slate-500 hover:text-slate-300 underline ml-1"
            >
              Limpar busca
            </button>
          )}
        </div>

        {/* Action bar & Filters */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              {selectedJobIds.length > 0 && selectedJobIds.length === sorted.length ? (
                <CheckSquare className="h-4 w-4 text-emerald-400" />
              ) : (
                <Square className="h-4 w-4 text-slate-600" />
              )}
              <span>{selectedJobIds.length > 0 ? "Desmarcar todas" : "Selecionar todas"}</span>
            </button>

            <div className="h-4 w-px bg-slate-800" />

            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition ${statusFilter === "all" ? "bg-slate-800 text-white font-medium" : "text-slate-400"}`}
                >
                  Todas ({totalBaseCount})
                </button>
                <button
                  onClick={() => setStatusFilter("strong")}
                  className={`px-2.5 py-1 rounded-md transition ${statusFilter === "strong" ? "bg-emerald-400/20 text-emerald-300 font-medium" : "text-slate-400"}`}
                >
                  Alta Compatibilidade (70+) ({strongCount})
                </button>
                <button
                  onClick={() => setStatusFilter("unranked")}
                  className={`px-2.5 py-1 rounded-md transition ${statusFilter === "unranked" ? "bg-slate-800 text-white font-medium" : "text-slate-400"}`}
                >
                  Sem Score ({unrankedCount})
                </button>
              </div>

              {/* Filtro por Modalidade (work_mode) */}
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
                <button
                  onClick={() => setWorkModeFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition ${workModeFilter === "all" ? "bg-slate-800 text-white font-medium" : "text-slate-400"}`}
                >
                  Qualquer Formato
                </button>
                <button
                  onClick={() => setWorkModeFilter("remoto")}
                  className={`px-2.5 py-1 rounded-md transition ${workModeFilter === "remoto" ? "bg-emerald-400/20 text-emerald-300 font-medium" : "text-slate-400"}`}
                >
                  Remoto
                </button>
                <button
                  onClick={() => setWorkModeFilter("hibrido")}
                  className={`px-2.5 py-1 rounded-md transition ${workModeFilter === "hibrido" ? "bg-sky-400/20 text-sky-300 font-medium" : "text-slate-400"}`}
                >
                  Híbrido
                </button>
                <button
                  onClick={() => setWorkModeFilter("presencial")}
                  className={`px-2.5 py-1 rounded-md transition ${workModeFilter === "presencial" ? "bg-slate-800 text-white font-medium" : "text-slate-400"}`}
                >
                  Presencial
                </button>
              </div>

              {/* Ordenação */}
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span className="ml-1 text-[11px] text-slate-500">Ordem:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "score" | "date")}
                  className="rounded-lg bg-slate-950 border border-slate-800 px-2 py-1 text-xs text-slate-200 outline-none focus:border-emerald-400"
                >
                  <option value="score">Maior Score</option>
                  <option value="date">Mais Recentes</option>
                </select>
              </div>
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
          <h2 className="font-semibold text-white">
            {statusFilter === "strong" && strongCount === 0
              ? "Nenhuma vaga classificada com Alta Compatibilidade (70+)"
              : searchQuery.trim()
              ? `Nenhuma vaga encontrada para "${searchQuery}"`
              : "Nenhuma vaga encontrada"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {statusFilter === "strong" && unrankedCount > 0
              ? `Você possui ${unrankedCount} vagas pendentes de classificação. Clique em "Classificar por Fit" para calcular os scores de compatibilidade.`
              : "Use a busca ou os atalhos de busca rápida acima para pesquisar vagas nos portais."}
          </p>
          {statusFilter === "strong" && unrankedCount > 0 && (
            <Button size="sm" className="mt-4 gap-2 bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={rankJobs} disabled={ranking}>
              {ranking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
              <span>Classificar Vagas Pendentes</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3 pb-20">
          {sorted.map((job) => {
            const fitBadge = formatFitBadge(job.fit, job.score)
            const isSelected = selectedJobIds.includes(job.id)
            return (
              <div
                key={job.id || job.key}
                className={`rounded-2xl border p-5 transition ${
                  isSelected
                    ? "border-emerald-500/50 bg-emerald-950/10"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox de seleção múltipla */}
                  <button
                    onClick={() => toggleSelectJob(job.id)}
                    className="mt-1 text-slate-500 hover:text-emerald-400 transition"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-700" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => {
                              setPreviewJob(job)
                              setShowPreviewDrawer(true)
                            }}
                            className="text-lg font-semibold text-white hover:text-emerald-400 transition text-left"
                          >
                            {job.title}
                          </button>
                          {job.score !== null && job.score !== undefined && (
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
                        <button
                          onClick={() => {
                            setPreviewJob(job)
                            setShowPreviewDrawer(true)
                          }}
                          className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
                          title="Abrir Job Preview & Score Report"
                        >
                          <Eye className="h-3.5 w-3.5 text-purple-400" />
                          <span>Preview & Report</span>
                        </button>

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
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Floating Toolbar para Ações em Lote */}
      <BulkActionsToolbar
        selectedJobIds={selectedJobIds}
        onClearSelection={() => setSelectedJobIds([])}
        onBulkCompleted={() => loadJobs()}
      />

      {/* Job Preview & Score Report Drawer */}
      <JobPreviewDrawer
        job={previewJob}
        isOpen={showPreviewDrawer}
        onClose={() => {
          setShowPreviewDrawer(false)
          setPreviewJob(null)
        }}
        onStatusChange={() => loadJobs()}
        onOpenApplyModal={(j) => {
          setShowPreviewDrawer(false)
          setSelectedJob(j)
          setShowApply(true)
        }}
      />

      {/* Modal de Candidatura */}
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
