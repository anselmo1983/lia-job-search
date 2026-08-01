"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, BriefcaseBusiness, FileCheck2, FolderOpen, Radar, Search, Upload, Settings as SettingsIcon, Loader2 } from "lucide-react"
import { PageHeader } from "@/components/app-shell"

export default function DashboardPage() {
  const [summary, setSummary] = useState({ jobs: 0, applications: 0, open: 0, documents: 0, cvs: 0, letters: 0 })
  const [loading, setLoading] = useState(true)
  const [bifrost, setBifrost] = useState<{ connected: boolean } | null>(null)

  useEffect(() => {
    loadSummary()
    fetch("/api/inference/status")
      .then((r) => r.json())
      .then((d) => setBifrost({ connected: Boolean(d?.connected) }))
      .catch(() => setBifrost({ connected: false }))
  }, [])

  async function loadSummary() {
    try {
      const [jobsRes, appsRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/outcome"),
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
    { label: "Vagas encontradas", value: summary.jobs, icon: Radar, href: "/jobs", color: "text-emerald-400" },
    { label: "Candidaturas", value: summary.applications, icon: BriefcaseBusiness, href: "/applications", color: "text-blue-400" },
    { label: "Processos abertos", value: summary.open, icon: FileCheck2, href: "/applications", color: "text-amber-400" },
    { label: "Inferência (Bifrost)", value: bifrost ? (bifrostConnected ? "Conectado" : "Desconectado") : "Verificando...", icon: SettingsIcon, href: "/settings", color: bifrost ? (bifrostConnected ? "text-emerald-400" : "text-red-400") : "text-slate-400" },
  ]

  const quickActions = [
    { label: "Buscar vagas", href: "/jobs", icon: Search, desc: "Encontre vagas no Brasil usando IA" },
    { label: "Upload de currículo", href: "/settings", icon: Upload, desc: "Envie seu PDF para extrair o perfil" },
    { label: "Status da inferência", href: "/settings", icon: SettingsIcon, desc: "Autoridade de inferência: CT109 Bifrost (server-side)" },
    { label: "Ver candidaturas", href: "/applications", icon: BriefcaseBusiness, desc: "Acompanhe o pipeline de aplicações" },
  ]

  return (
    <>
      <PageHeader
        title="LIA Job Search"
        description="Plataforma completa de busca e candidatura a vagas com IA. Dashboard ao vivo com dados do seu workspace."
      />

      {/* Stats Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, href, color }) => (
            <Link href={href} key={label} className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-400/50">
              <div className="flex items-center justify-between">
                <Icon className={`h-5 w-5 ${color}`} />
                <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-400" />
              </div>
              {typeof value === "number" ? (
                <p className="mt-6 text-3xl font-bold">{value}</p>
              ) : (
                <p className={`mt-6 text-sm font-semibold ${color}`}>{value}</p>
              )}
              <p className="mt-1 text-sm text-slate-400">{label}</p>
            </Link>
          ))}
        </section>
      )}

      {/* Quick Actions */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Ações Rápidas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map(({ label, href, icon: Icon, desc }) => (
            <Link href={href} key={label} className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-400/50">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400/15">
                <Icon className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold">{label}</h3>
                <p className="mt-1 text-sm text-slate-400">{desc}</p>
              </div>
              <ArrowRight className="ml-auto mt-2 h-4 w-4 shrink-0 text-slate-600" />
            </Link>
          ))}
        </div>
      </section>

      {/* Status Message */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-semibold">Workflow Completo na UI</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/15 text-xs text-emerald-300">✓</span>
              Buscar vagas por IA
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/15 text-xs text-emerald-300">✓</span>
              Classificar por fit automático
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/15 text-xs text-emerald-300">✓</span>
              Gerar currículo adaptado + carta
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/15 text-xs text-emerald-300">✓</span>
              Revisão por segundo agente IA
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/15 text-xs text-emerald-300">✓</span>
              Salvar e registrar candidatura
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-semibold">Próximos Passos</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs font-bold text-emerald-300">1</span>
              <Link href="/settings" className="text-emerald-400 hover:underline">Upload do currículo</Link> em Settings para extrair o perfil
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs font-bold text-emerald-300">2</span>
              <Link href="/jobs" className="text-emerald-400 hover:underline">Buscar vagas</Link> e classificar por fit
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs font-bold text-emerald-300">3</span>
              Aplicar para vagas com documentos gerados automaticamente
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs font-bold text-emerald-300">4</span>
              <Link href="/settings" className="text-emerald-400 hover:underline">Verificar o status do Bifrost</Link> (CT109) em Settings
            </li>
          </ol>
        </div>
      </section>
    </>
  )
}
