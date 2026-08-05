import { FileText } from "lucide-react"
import { EmptyState, PageHeader } from "@/components/app-shell"
import { ResumeManager } from "@/components/resumes/resume-manager"
import { getWorkspaceFiles } from "@/lib/job-data"

export const dynamic = "force-dynamic"
export const metadata = { title: "Resume & Document Manager" }

export default async function ResumesPage() {
  const [resumes, letters] = await Promise.all([
    getWorkspaceFiles("cv"),
    getWorkspaceFiles("cover_letters"),
  ])
  const sections = [
    { title: "Arquivos de CV (Templates/PDFs)", directory: "cv/", files: resumes },
    { title: "Cartas de Apresentação", directory: "cover_letters/", files: letters },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Compilador & Gerenciador de Currículos"
        description="Geração desacoplada de currículos compilados por vaga (CandidateProfile → ResumeDocument → Renderer → PDF)."
      />

      {/* Componente Interativo de Currículos Compilados (Absorção Reactive Resume / resuml) */}
      <ResumeManager />

      {/* Seção de Arquivos Físicos do Workspace */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Arquivos do Workspace (`cv/` e `cover_letters/`)</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {sections.map((section) => (
            <section key={section.directory} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-200">{section.title}</h2>
                  <code className="text-xs text-emerald-300">{section.directory}</code>
                </div>
                <span className="font-mono text-2xl font-bold text-slate-300">{section.files.length}</span>
              </div>
              <div className="mt-5 space-y-2">
                {section.files.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum arquivo no diretório.</p>
                ) : (
                  section.files.map((file) => (
                    <div key={file} className="flex items-center gap-3 rounded-lg bg-slate-950 px-3 py-2 text-sm text-slate-300">
                      <FileText className="h-4 w-4 text-emerald-400" />
                      <span className="truncate">{file}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
