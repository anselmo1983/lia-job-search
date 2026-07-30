import { ExternalLink } from "lucide-react"
import { EmptyState, PageHeader } from "@/components/app-shell"
import { getJobs } from "@/lib/job-data"

export const dynamic = "force-dynamic"
export const metadata = { title: "Vagas" }

export default async function JobsPage() {
  const jobs = (await getJobs()).sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  return <><PageHeader title="Vagas" description="Resultados descobertos e classificados em job_scraper/seen_jobs.json." />
    {jobs.length === 0 ? <EmptyState title="Nenhuma vaga encontrada" description="Execute o workflow de busca. Os resultados aparecerão aqui automaticamente." command="/scrape" /> : <div className="overflow-hidden rounded-2xl border border-slate-800"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400"><tr><th className="p-4">Vaga</th><th className="p-4">Local</th><th className="p-4">Status</th><th className="p-4">Fit</th><th className="p-4 text-right">Score</th></tr></thead><tbody className="divide-y divide-slate-800">{jobs.map((job) => <tr key={job.key} className="bg-slate-950/40 hover:bg-slate-900/70"><td className="p-4"><div className="font-medium">{job.title}</div><div className="mt-1 text-slate-400">{job.company}</div>{job.url && <a href={job.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline">Abrir anúncio <ExternalLink className="h-3 w-3"/></a>}</td><td className="p-4 text-slate-300">{job.location}</td><td className="p-4"><span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs">{job.status}</span></td><td className="p-4 text-slate-300">{job.fit}</td><td className="p-4 text-right font-mono text-lg text-emerald-300">{job.score ?? "—"}</td></tr>)}</tbody></table></div></div>}
  </>
}
