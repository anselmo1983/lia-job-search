import Link from "next/link"
import { ArrowRight, BriefcaseBusiness, FileCheck2, FolderOpen, Radar } from "lucide-react"
import { PageHeader } from "@/components/app-shell"
import { getWorkspaceSummary } from "@/lib/job-data"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const summary = await getWorkspaceSummary()
  const cards = [
    { label: "Vagas encontradas", value: summary.jobs.length, icon: Radar, href: "/jobs" },
    { label: "Candidaturas", value: summary.applications.length, icon: BriefcaseBusiness, href: "/applications" },
    { label: "Processos abertos", value: summary.open.length, icon: FileCheck2, href: "/applications" },
    { label: "Arquivos locais", value: summary.documents + summary.cvs + summary.letters, icon: FolderOpen, href: "/documents" },
  ]
  return <>
    <PageHeader title="Visão geral" description="Acompanhe o estado real do seu workspace. Os números são lidos diretamente dos arquivos locais e não são enviados para serviços externos." />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, href }) => <Link href={href} key={label} className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-400/50"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-emerald-400"/><ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-400"/></div><p className="mt-6 text-3xl font-bold">{value}</p><p className="mt-1 text-sm text-slate-400">{label}</p></Link>)}</section>
    <section className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-lg font-semibold">Próximo passo recomendado</h2><p className="mt-2 text-sm text-slate-400">{summary.jobs.length === 0 ? "Faça sua primeira busca nos portais configurados." : summary.applications.length === 0 ? "Classifique as vagas encontradas e escolha uma candidatura." : "Atualize os resultados dos processos em andamento."}</p><code className="mt-5 inline-block rounded-lg bg-slate-950 px-4 py-2 text-emerald-300">{summary.jobs.length === 0 ? "/scrape" : summary.applications.length === 0 ? "/rank" : "/outcome"}</code></div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-lg font-semibold">Privacidade por padrão</h2><p className="mt-2 text-sm leading-6 text-slate-400">A UI lê `job_search_tracker.csv`, `job_scraper/seen_jobs.json` e as pastas de documentos no servidor local. Conteúdo pessoal permanece protegido pelas regras do `.gitignore`.</p></div>
    </section>
  </>
}
