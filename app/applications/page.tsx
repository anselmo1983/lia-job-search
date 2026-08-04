"use client"

import { useState, useEffect, FormEvent } from "react"
import { BriefcaseBusiness, Plus, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/app-shell"

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-400"

const finalStatuses = new Set(["hired", "rejected", "no response", "withdrawn", "offer declined", "contratado", "rejeitado", "sem resposta", "retirado", "recusado"])

function formatStatusPtBr(status: string): string {
  const s = (status || "").toLowerCase()
  const map: Record<string, string> = {
    applied: "Candidatado",
    screening: "Triagem Inicial",
    interview: "Entrevista Agendada",
    technical: "Desafio Técnico",
    offer: "Proposta Recebida",
    hired: "Contratado 🎉",
    rejected: "Não Selecionado / Rejeitado",
    withdrawn: "Candidatura Retirada",
    "no response": "Sem Resposta",
    "offer declined": "Proposta Recusada",
  }
  return map[s] || status
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ company: "", role: "", status: "applied", notes: "", date: new Date().toISOString().split("T")[0] })

  useEffect(() => { loadApplications() }, [])

  async function loadApplications() {
    setLoading(true)
    try {
      const res = await fetch("/api/outcome")
      const data = await res.json()
      setApplications(data.applications || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  async function submitApplication(e: FormEvent) {
    e.preventDefault()
    if (!form.company.trim() || !form.role.trim()) return
    setSaving(true)
    try {
      await fetch("/api/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      setForm({ company: "", role: "", status: "applied", notes: "", date: new Date().toISOString().split("T")[0] })
      setShowForm(false)
      await loadApplications()
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  return (
    <>
      <PageHeader title="Candidaturas" description="Registre e acompanhe todas as suas candidaturas em um só lugar." />

      <div className="mb-6 flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Fechar" : "Nova Candidatura"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={submitApplication} className="mb-6 rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-slate-900 to-emerald-950/20 p-5">
          <h3 className="mb-4 font-semibold text-white">Registrar Candidatura</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputClass} placeholder="Empresa *" value={form.company} onChange={e => setForm({...form, company: e.target.value})} required />
            <input className={inputClass} placeholder="Cargo *" value={form.role} onChange={e => setForm({...form, role: e.target.value})} required />
            <select className={inputClass} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="applied">Candidatado (Applied)</option>
              <option value="screening">Triagem Inicial (Screening)</option>
              <option value="interview">Entrevista Agendada (Interview)</option>
              <option value="technical">Desafio Técnico (Technical)</option>
              <option value="offer">Proposta Recebida (Offer)</option>
              <option value="hired">Contratado (Hired)</option>
              <option value="rejected">Rejeitado (Rejected)</option>
            </select>
            <input className={inputClass} type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            <textarea className={`${inputClass} col-span-full`} placeholder="Observações e detalhes da candidatura..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} />
          </div>
          <Button className="mt-4" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BriefcaseBusiness className="h-4 w-4" />}
            {saving ? "Salvando..." : "Registrar Candidatura"}
          </Button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
          <BriefcaseBusiness className="mx-auto mb-4 h-10 w-10 text-slate-600" />
          <h2 className="font-semibold text-white">Nenhuma candidatura registrada</h2>
          <p className="mt-2 text-sm text-slate-400">Registre sua primeira candidatura manualmente ou via o workflow /apply nos Fill-Ups.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((app, i) => {
            const closed = finalStatuses.has((app.status || "").toLowerCase())
            return (
              <article key={i} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">{app.role || "Cargo não informado"}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${closed ? "bg-slate-800 text-slate-300" : "bg-emerald-400/15 text-emerald-300 border border-emerald-400/20"}`}>
                        {formatStatusPtBr(app.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-400">{app.company || "Empresa não informada"} · {app.date || "Data não informada"}</p>
                  </div>
                  {app.fit_rating && <div className="text-sm text-slate-400 sm:text-right"><p>Fit: <span className="text-slate-200 font-semibold">{app.fit_rating}</span></p></div>}
                </div>
                {app.notes && <p className="mt-4 border-t border-slate-800 pt-4 text-sm leading-6 text-slate-400">{app.notes}</p>}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
