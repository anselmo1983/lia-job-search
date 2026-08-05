import { PageHeader } from "@/components/app-shell"
import { getWorkspaceSummary } from "@/lib/job-data"

export const dynamic = "force-dynamic"
export const metadata = { title: "Job Search Statistics" }

export default async function StatisticsPage() {
  const { applications, jobs } = await getWorkspaceSummary()
  const statusCounts = applications.reduce<Record<string, number>>((counts, item) => { const key = item.status || "unknown"; counts[key] = (counts[key] ?? 0) + 1; return counts }, {})
  const interviews = applications.filter((item) => /interview|assessment|offer|hired/i.test(item.status)).length
  const offers = applications.filter((item) => /offer|hired/i.test(item.status)).length
  const responseRate = applications.length ? Math.round((applications.filter((item) => !/applied|no response/i.test(item.status)).length / applications.length) * 100) : 0
  const metrics = [["Jobs discovered", jobs.length], ["Applications sent", applications.length], ["Interview processes", interviews], ["Offers", offers], ["Response rate", `${responseRate}%`]]
  const maximum = Math.max(1, ...Object.values(statusCounts))
  return <><PageHeader title="Job Search Statistics" description="Measure activity and conversion using your canonical application tracker."/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-3xl font-bold text-emerald-300">{value}</p><p className="mt-1 text-sm text-slate-400">{label}</p></div>)}</div><section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="font-semibold">Application pipeline</h2>{Object.keys(statusCounts).length === 0 ? <p className="mt-4 text-sm text-slate-500">Statistics will appear after your first tracked application.</p> : <div className="mt-6 space-y-4">{Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => <div key={status}><div className="mb-1 flex justify-between text-sm"><span className="capitalize text-slate-300">{status}</span><span className="font-mono">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${(count / maximum) * 100}%` }}/></div></div>)}</div>}</section></>
}
