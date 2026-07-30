import { ExternalLink } from "lucide-react"
import { EmptyState, PageHeader } from "@/components/app-shell"
import { getApplications } from "@/lib/job-data"

export const dynamic = "force-dynamic"
export const metadata = { title: "Candidaturas" }

const finalStatuses = new Set(["hired", "rejected", "no response", "withdrawn", "offer declined"])

export default async function ApplicationsPage() {
  const applications = await getApplications()
  return <><PageHeader title="Candidaturas" description="Pipeline lido de job_search_tracker.csv, a fonte canônica dos processos enviados." />
    {applications.length === 0 ? <EmptyState title="Nenhuma candidatura registrada" description="Use /apply para preparar materiais e /outcome para registrar uma candidatura ou resultado." command="/apply <URL da vaga>" /> : <div className="grid gap-4">{applications.map((application, index) => { const closed = finalStatuses.has(application.status.toLowerCase()); return <article key={`${application.company}-${application.role}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{application.role || "Cargo não informado"}</h2><span className={`rounded-full px-2.5 py-1 text-xs ${closed ? "bg-slate-800 text-slate-300" : "bg-emerald-400/15 text-emerald-300"}`}>{application.status || "sem status"}</span></div><p className="mt-1 text-slate-400">{application.company || "Empresa não informada"} · {application.date || "Data não informada"}</p></div><div className="text-sm text-slate-400 sm:text-right"><p>Fit: <span className="text-slate-200">{application.fitRating || "—"}</span></p><p>Canal: <span className="text-slate-200">{application.channel || "—"}</span></p></div></div>{application.notes && <p className="mt-4 border-t border-slate-800 pt-4 text-sm leading-6 text-slate-400">{application.notes}</p>}{application.source && /^https?:\/\//.test(application.source) && <a href={application.source} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">Ver fonte <ExternalLink className="h-3 w-3"/></a>}</article>})}</div>}
  </>
}
