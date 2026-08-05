import { FileText } from "lucide-react"
import { EmptyState, PageHeader } from "@/components/app-shell"
import { getWorkspaceFiles } from "@/lib/job-data"

export const dynamic = "force-dynamic"
export const metadata = { title: "Resume Templates" }
export default async function ResumesPage() {
  const [resumes, letters] = await Promise.all([getWorkspaceFiles("cv"), getWorkspaceFiles("cover_letters")])
  const sections = [{ title: "Resume files", directory: "cv/", files: resumes }, { title: "Cover letter files", directory: "cover_letters/", files: letters }]
  return <><PageHeader title="Resume Templates" description="Manage the source templates and tailored files used by the application workflow."/><div className="grid gap-6 lg:grid-cols-2">{sections.map((section) => <section key={section.directory} className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">{section.title}</h2><code className="text-xs text-emerald-300">{section.directory}</code></div><span className="font-mono text-2xl font-bold">{section.files.length}</span></div><div className="mt-5 space-y-2">{section.files.length === 0 ? <p className="text-sm text-slate-500">No files found.</p> : section.files.map((file) => <div key={file} className="flex items-center gap-3 rounded-lg bg-slate-950 px-3 py-2 text-sm"><FileText className="h-4 w-4 text-emerald-400"/><span className="truncate">{file}</span></div>)}</div></section>)}</div>{resumes.length + letters.length === 0 && <div className="mt-6"><EmptyState title="Add your first template" description="Register a LaTeX, Typst, or custom template through the canonical workflow." command="/add-template"/></div>}</>
}
