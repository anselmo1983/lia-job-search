"use client"

import { useState, useEffect } from "react"
import { ExternalLink, Search, Radar, Loader2, Star } from "lucide-react"
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

  async function scrapeJobs() {
    setScraping(true)
    setSearchResults([])
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery || "desenvolvedor", location: searchLocation }),
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
  const filteredDisplay = searchLocation.trim()
    ? displayJobs.filter((job) => {
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
    : displayJobs
  const sorted = [...filteredDisplay].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))

  return (
    <>
      <PageHeader title="Vagas" description="Busque, classifique e candidate-se a vagas diretamente da interface." />
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="w-full flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-400 sm:w-auto" placeholder="Ex: desenvolvedor React, data science" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-400 sm:w-40" placeholder="Local" value={searchLocation} onChange={e => setSearchLocation(e.target.value)} />
          <Button onClick={scrapeJobs} disabled={scraping}>
            {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            {scraping ? "Buscando..." : "Buscar Vagas"}
          </Button>
        </div>
        <div className="mt-3 flex gap-3">
          <Button variant="secondary" onClick={rankJobs} disabled={ranking || jobs.length === 0}>
            {ranking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
            {ranking ? "Classificando..." : `Classificar ${jobs.filter(j => j.score === null).length} vagas`}
          </Button>
        </div>
      </section>
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
          <Search className="mx-auto mb-4 h-10 w-10 text-slate-600" />
          <h2 className="font-semibold">Nenhuma vaga encontrada</h2>
          <p className="mt-2 text-sm text-slate-400">Use a busca acima para encontrar vagas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((job) => (
            <div key={job.id || job.key} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{job.title}</h2>
                    {job.score !== null && <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-400 text-xs font-bold text-slate-950">{job.score}</span>}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${
                      job.fit === "strong fit" || job.fit === "high" ? "bg-emerald-400/15 text-emerald-300" :
                      job.fit === "unrated" ? "bg-slate-800 text-slate-400" : "bg-amber-400/15 text-amber-300"
                    }`}>{job.fit || "não classificado"}</span>
                  </div>
                  <p className="mt-1 text-slate-400">{job.company} · {job.location || "Local não informado"}</p>
                  {job.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{job.description}</p>}
                  {job.date && <p className="mt-1 text-xs text-slate-600">{job.date}</p>}
                </div>
                <div className="flex items-start gap-2">
                  {job.url && (
                    <a href={job.url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-emerald-400">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <Button size="sm" onClick={() => { setSelectedJob(job); setShowApply(true) }}>Aplicar</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showApply && selectedJob && <JobApplyModal job={selectedJob} onClose={() => { setShowApply(false); setSelectedJob(null) }} onComplete={() => loadJobs()} />}
    </>
  )
}
