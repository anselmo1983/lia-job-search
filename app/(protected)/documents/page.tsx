import { FileText, FolderOpen } from "lucide-react"
import { PageHeader } from "@/components/app-shell"
import { getWorkspaceSummary } from "@/lib/job-data"

export const dynamic = "force-dynamic"
export const metadata = { title: "Documentos" }

export default async function DocumentsPage() {
  const summary = await getWorkspaceSummary()
  const groups = [
    { name: "Documentos de origem", directory: "documents/", count: summary.documents, description: "CVs importados, diplomas, referências e arquivos de candidaturas." },
    { name: "Currículos gerados", directory: "cv/", count: summary.cvs, description: "Templates e versões adaptadas pelo workflow /apply." },
    { name: "Cartas de apresentação", directory: "cover_letters/", count: summary.letters, description: "Templates e cartas personalizadas para cada vaga." },
  ]
  return <><PageHeader title="Documentos" description="Inventário seguro dos arquivos locais. Por privacidade, a interface mostra contagens e caminhos, não o conteúdo pessoal." /><div className="grid gap-4 md:grid-cols-3">{groups.map((group) => <article key={group.directory} className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-center justify-between"><FolderOpen className="h-6 w-6 text-emerald-400"/><span className="font-mono text-2xl font-bold">{group.count}</span></div><h2 className="mt-6 font-semibold">{group.name}</h2><code className="mt-2 block text-xs text-emerald-300">{group.directory}</code><p className="mt-3 text-sm leading-6 text-slate-400">{group.description}</p></article>)}</div><div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex gap-3"><FileText className="mt-0.5 h-5 w-5 text-emerald-400"/><div><h2 className="font-semibold">Adicionar ou atualizar seu perfil</h2><p className="mt-1 text-sm text-slate-400">Coloque os arquivos nas subpastas documentadas em documents/README.md e execute:</p><code className="mt-3 inline-block rounded-lg bg-slate-950 px-4 py-2 text-sm text-emerald-300">/setup</code></div></div></div></>
}
