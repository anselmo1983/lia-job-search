"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, BriefcaseBusiness, FileCheck2, FolderOpen, Radar, Search, Upload, Settings as SettingsIcon, Loader2 } from "lucide-react"
import { PageHeader } from "@/components/app-shell"
import { fetchWithAuth } from "@/lib/auth/client-guard"

export default function DashboardPage() {
  const [summary, setSummary] = useState({ jobs: 0, applications: 0, open: 0, documents: 0, cvs: 0, letters: 0 })
  const [loading, setLoading] = useState(true)
  const [bifrost, setBifrost] = useState<{ connected: boolean } | null>(null)

  useEffect(() => {
    loadSummary()
    fetchWithAuth("/api/inference/status")
      .then((r) => r.json())
      .then((d) => setBifrost({ connected: Boolean(d?.connected) }))
      .catch(() => setBifrost({ connected: false }))
  }, [])

  async function loadSummary() {
    try {
      const [jobsRes, appsRes] = await Promise.all([
        fetchWithAuth("/api/jobs"),
        fetchWithAuth("/api/applications"),
      ])
      const jobsData = await jobsRes.json()
      const appsData = await appsRes.json()

      const apps = appsData.applications || []
      const open = apps.filter((a: any) => !["hired", "rejected", "no response", "withdrawn"].includes((a.status || "").toLowerCase()))

      setSummary({
        jobs: jobsData.total || jobsData.jobs?.length || 0,
        applications: apps.length || 0,
        open: open.length,
        documents: 0,
        cvs: 0,
        letters: 0,
      })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const bifrostConnected = bifrost?.connected ?? false
  const cards = [
    { label: "Vagas Encontradas", value: summary.jobs, icon: Radar, href: "/jobs", gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 text-emerald-400" },
    { label: "Candidaturas Registradas", value: summary.applications, icon: BriefcaseBusiness, href: "/applications", gradient: "from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20 text-blue-400" },
    { label: "Processos Em Aberto", value: summary.open, icon: FileCheck2, href: "/applications", gradient: "from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 text-amber-400" },
    { label: "Gateway IA (Bifrost)", value: bifrost ? (bifrostConnected ? "Ativo (CT109)" : "Desconectado") : "Verificando...", icon: SettingsIcon, href: "/settings", gradient: bifrostConnected ? "from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 text-emerald-400" : "from-red-500/10 via-red-500/5 to-transparent border-red-500/20 text-red-400" },
  ]

  const quickActions = [
    { label: "Buscar Vagas", href: "/jobs", icon: Search, desc: "Encontre e classifique vagas por fit automatizado com IA" },
    { label: "Perfil & Currículo Base", href: "/settings", icon: Upload, desc: "Gerencie seu perfil factual e envie currículos em PDF" },
    { label: "Pipeline de Aplicações", href: "/applications", icon: BriefcaseBusiness, desc: "Monitore candidaturas com audit trail no SQLite" },
    { label: "Status da Inferência", href: "/settings", icon: SettingsIcon, desc: "Autoridade canônica de IA: CT109 Bifrost Gateway" },
  ]

  return (
    <>
      <PageHeader
        title="LIA Job Search"
        description="Plataforma canônica e automatizada para busca de vagas, adequação de CVs e acompanhamento de candidaturas."
      />

      {/* Metric Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, href, gradient }) => (
            <Link
              href={href}
              key={label}
              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/20 ${gradient}`}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-slate-950/60 p-2.5 backdrop-blur-sm border border-slate-800/60">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 transition-all duration-300 group-hover:translate-x-1 group-hover:text-emerald-400" />
              </div>
              {typeof value === "number" ? (
                <p className="mt-5 text-4xl font-extrabold tracking-tight text-white">{value}</p>
              ) : (
                <p className="mt-5 text-base font-bold tracking-wide">{value}</p>
              )}
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
            </Link>
          ))}
        </section>
      )}

      {/* Quick Actions */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-white">Ações Rápidas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map(({ label, href, icon: Icon, desc }) => (
            <Link
              href={href}
              key={label}
              className="group flex items-start gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/40 hover:bg-slate-900/90"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 transition-transform duration-300 group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white group-hover:text-emerald-300 transition-colors">{label}</h3>
                <p className="mt-1 text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition-all duration-300 group-hover:translate-x-1 group-hover:text-emerald-400 mt-1" />
            </Link>
          ))}
        </div>
      </section>

      {/* Architecture & Workflow Status */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="font-semibold text-white">Arquitetura Canônica de IA (Bifrost)</h2>
          </div>
          <ul className="space-y-3.5 text-sm text-slate-300">
            <li className="flex items-center gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs text-emerald-400 font-bold">✓</span>
              Inferência 100% roteada através do Bifrost AI Gateway (CT109).
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs text-emerald-400 font-bold">✓</span>
              Modelos duplo-agente (Geração Padrão + Revisão ATS Especializada).
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs text-emerald-400 font-bold">✓</span>
              Persistência atômica no banco SQLite unificado (WAL mode).
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs text-emerald-400 font-bold">✓</span>
              Scraping multi-portal paralelo simultâneo sem estouro de timeout.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-semibold text-white">Próximas Ações no Workspace</h2>
          </div>
          <ol className="space-y-3.5 text-sm text-slate-300">
            <li className="flex items-center gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs font-bold text-emerald-400">1</span>
              <Link href="/settings" className="text-emerald-400 hover:underline font-medium">Configurações</Link>: Envie seu currículo PDF para extrair o perfil.
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs font-bold text-emerald-400">2</span>
              <Link href="/jobs" className="text-emerald-400 hover:underline font-medium">Vagas</Link>: Realize buscas paralelas nos portais e filtre por fit.
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs font-bold text-emerald-400">3</span>
              <Link href="/applications" className="text-emerald-400 hover:underline font-medium">Candidaturas</Link>: Monitore o histórico de cada etapa.
            </li>
          </ol>
        </div>
      </section>
    </>
  )
}
