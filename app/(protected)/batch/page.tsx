"use client"

import { useState, useEffect } from "react"
import { Package, Loader2, CheckCircle, AlertCircle, Clock, ExternalLink, Plus, Trash2 } from "lucide-react"
import { PageHeader } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { fetchWithAuth } from "@/lib/auth/client-guard"

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-teal"

type BatchJob = {
  id: string
  title: string
  company: string
  description?: string
  url?: string
  location?: string
}

type BatchStatus = {
  batchId: string
  status: string
  totalJobs?: number
  requestCounts?: { total: number; completed: number; failed: number }
  results?: { id: string; title: string; company: string; evaluation?: any; error?: string }[]
}

export default function BatchPage() {
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([])
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState("")
  const [newJob, setNewJob] = useState({ title: "", company: "", url: "" })

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
    try {
      const res = await fetchWithAuth("/api/jobs")
      const data = await res.json()
      const jobs = (data.jobs || []).filter((j: any) => j.score === null).slice(0, 50)
      setBatchJobs(jobs.map((j: any) => ({
        id: j.id || j.key,
        title: j.title,
        company: j.company,
        description: j.description,
        url: j.url,
        location: j.location,
      })))
    } catch {}
  }

  function addJob() {
    if (!newJob.title.trim()) return
    setBatchJobs([...batchJobs, { ...newJob, id: crypto.randomUUID() }])
    setNewJob({ title: "", company: "", url: "" })
  }

  function removeJob(id: string) {
    setBatchJobs(batchJobs.filter(j => j.id !== id))
  }

  async function submitBatch() {
    if (batchJobs.length === 0) return setError("Adicione ao menos uma vaga ao lote!")
    
    setLoading(true)
    setError("")
    setBatchStatus(null)
    
    try {
      const res = await fetchWithAuth("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: batchJobs })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      
      setBatchStatus(data)
      // Iniciar polling
      startPolling(data.batchId)
    } catch (err) {
      setError("Erro ao criar batch")
    }
    setLoading(false)
  }

  function startPolling(batchId: string) {
    setPolling(true)
    const interval = setInterval(async () => {
      try {
        const res = await fetchWithAuth(`/api/batch?batchId=${encodeURIComponent(batchId)}`)
        const data = await res.json()
        setBatchStatus(prev => ({ ...prev, ...data }))
        
        if (["completed", "failed"].includes(data.status)) {
          clearInterval(interval)
          setPolling(false)
        }
      } catch {
        clearInterval(interval)
        setPolling(false)
      }
    }, 10000)
  }

  const statusIcon: Record<string, any> = {
    in_progress: <Loader2 className="h-5 w-5 animate-spin text-teal" />,
    completed: <CheckCircle className="h-5 w-5 text-emerald-400" />,
    failed: <AlertCircle className="h-5 w-5 text-red-400" />,
  }

  return (
    <>
      <PageHeader
        title="Batch Processing"
        description="Processe múltiplas vagas em lote via Bifrost (CT109) — processamento sequencial em segundo plano."
      />

      {/* Notice */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-teal/20 bg-teal/5 p-4">
          <Package className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
          <div>
            <p className="text-sm font-semibold text-cloud">Batch via Bifrost (CT109)</p>
            <p className="mt-1 text-xs text-silver">
              O lote é processado em segundo plano, sequencialmente, com inferência do CT109. 
              Nenhuma chave é necessária no navegador — as credenciais ficam no servidor.
            </p>
          </div>
        </div>

      {/* Job List */}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 font-heading font-semibold text-cloud">Vagas no Lote ({batchJobs.length})</h2>
        
        {/* Add Job Form */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input className={`${inputClass} flex-1`} placeholder="Título da vaga" value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} />
          <input className={`${inputClass} flex-1`} placeholder="Empresa" value={newJob.company} onChange={e => setNewJob({ ...newJob, company: e.target.value })} />
          <input className={`${inputClass} flex-1`} placeholder="URL (opcional)" value={newJob.url} onChange={e => setNewJob({ ...newJob, url: e.target.value })} />
          <Button onClick={addJob}><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>

        {/* List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {batchJobs.length === 0 ? (
            <p className="py-8 text-center text-sm text-silver">Nenhuma vaga no lote. Adicione manualmente ou busque em Jobs.</p>
          ) : (
            batchJobs.map((job, i) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-mono">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-cloud">{job.title}</p>
                    <p className="text-xs text-silver">{job.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-teal"><ExternalLink className="h-4 w-4" /></a>}
                  <button onClick={() => removeJob(job.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Submit */}
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={submitBatch} disabled={loading || batchJobs.length === 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            {loading ? "Criando batch..." : `Processar ${batchJobs.length} vagas em lote`}
          </Button>
          {batchJobs.length > 0 && (
            <span className="text-xs text-silver">
              sequencial · via Bifrost (CT109)
            </span>
          )}
        </div>
      </section>

      {/* Batch Status */}
      {batchStatus && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 font-heading font-semibold text-cloud">Status do Batch</h2>
          
          <div className="flex items-center gap-3 mb-4">
            {statusIcon[batchStatus.status] || <Clock className="h-5 w-5 text-slate-400" />}
            <div>
              <p className="font-medium text-cloud capitalize">{batchStatus.status === "in_progress" ? "Em processamento" : batchStatus.status === "completed" ? "Concluído" : batchStatus.status === "failed" ? "Falhou" : batchStatus.status || "Aguardando"}</p>
              {polling && <p className="text-xs text-teal animate-pulse">Atualizando a cada 10s...</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-950 p-3">
              <p className="text-xs text-silver">Batch ID</p>
              <p className="mt-1 font-mono text-xs text-cloud truncate">{batchStatus.batchId}</p>
            </div>
            <div className="rounded-lg bg-slate-950 p-3">
              <p className="text-xs text-silver">Total</p>
              <p className="mt-1 text-lg font-bold text-cloud">{batchStatus.requestCounts?.total || batchStatus.totalJobs || "—"}</p>
            </div>
            <div className="rounded-lg bg-slate-950 p-3">
              <p className="text-xs text-silver">Completos</p>
              <p className="mt-1 text-lg font-bold text-emerald-400">{batchStatus.requestCounts?.completed || 0}</p>
            </div>
            <div className="rounded-lg bg-slate-950 p-3">
              <p className="text-xs text-silver">Falhas</p>
              <p className="mt-1 text-lg font-bold text-red-400">{batchStatus.requestCounts?.failed || 0}</p>
            </div>
          </div>

          {(batchStatus.status === "completed" || batchStatus.status === "failed") && batchStatus.results && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-silver">Resultados por vaga</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {batchStatus.results.map((r) => (
                  <div key={r.id} className="rounded-lg bg-slate-950 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-cloud">{r.title}</p>
                        {r.company && <p className="truncate text-xs text-silver">{r.company}</p>}
                      </div>
                      {r.error ? (
                        <span className="shrink-0 text-xs text-red-400">Falhou</span>
                      ) : (
                        <span className="shrink-0 text-sm font-bold text-emerald-400">{r.evaluation?.fitScore ?? "—"}%</span>
                      )}
                    </div>
                    {r.error && <p className="mt-1 text-xs text-red-400">{r.error}</p>}
                    {!r.error && r.evaluation?.verdict && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{r.evaluation.verdict}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  )
}
