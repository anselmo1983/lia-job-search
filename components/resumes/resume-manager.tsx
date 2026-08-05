"use client"

import { useEffect, useState } from "react"
import {
  FileText,
  Plus,
  History,
  Eye,
  RotateCcw,
  Sparkles,
  Download,
  Code,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CompiledResumeItem {
  id: string
  title: string
  jobId?: string
  currentVersion: number
  updatedAt: string
}

interface ResumeVersionItem {
  id: string
  resumeId: string
  versionNumber: number
  author: string
  changeSummary: string
  createdAt: string
  snapshot: any
}

export function ResumeManager() {
  const [resumes, setResumes] = useState<CompiledResumeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [compiling, setCompiling] = useState(false)
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)

  // Documento selecionado para exibição / versão
  const [activeDoc, setActiveDoc] = useState<any | null>(null)
  const [versions, setVersions] = useState<ResumeVersionItem[]>([])
  const [htmlPreview, setHtmlPreview] = useState<string>("")
  const [latexCode, setLatexCode] = useState<string>("")

  // Form states para criação
  const [isCompileOpen, setIsCompileOpen] = useState(false)
  const [customTitle, setCustomTitle] = useState("")

  const loadResumes = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/resumes")
      const data = await res.json()
      if (data.resumes) {
        setResumes(data.resumes)
      }
    } catch (e) {
      console.error("Erro ao carregar currículos:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResumes()
  }, [])

  const handleCompile = async () => {
    setCompiling(true)
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customTitle: customTitle.trim() || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setIsCompileOpen(false)
        setCustomTitle("")
        loadResumes()
        openResume(data.resume.id)
      } else {
        alert(data.error || "Falha ao compilar currículo.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCompiling(false)
    }
  }

  const openResume = async (id: string) => {
    setSelectedResumeId(id)
    try {
      const [resDoc, resVersions, resRenderHtml, resRenderLatex] = await Promise.all([
        fetch(`/api/resumes/${id}`).then((r) => r.json()),
        fetch(`/api/resumes/${id}/versions`).then((r) => r.json()),
        fetch(`/api/resumes/${id}/render`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: "html" }),
        }).then((r) => r.json()),
        fetch(`/api/resumes/${id}/render`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: "latex" }),
        }).then((r) => r.json()),
      ])

      if (resDoc.resume) setActiveDoc(resDoc.resume)
      if (resVersions.versions) setVersions(resVersions.versions)
      if (resRenderHtml.content) setHtmlPreview(resRenderHtml.content)
      if (resRenderLatex.content) setLatexCode(resRenderLatex.content)
    } catch (e) {
      console.error("Erro ao abrir currículo:", e)
    }
  }

  const handleRollback = async (versionNumber: number) => {
    if (!selectedResumeId) return
    if (!confirm(`Reverter currículo para a versão ${versionNumber}?`)) return

    try {
      const res = await fetch(`/api/resumes/${selectedResumeId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetVersionNumber: versionNumber }),
      })
      const data = await res.json()
      if (data.success) {
        openResume(selectedResumeId)
        loadResumes()
      } else {
        alert(data.error || "Falha ao reverter versão.")
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este currículo compilado?")) return
    try {
      const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" })
      if (res.ok) {
        if (selectedResumeId === id) setSelectedResumeId(null)
        loadResumes()
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-400" />
            Currículos Compilados & Versões (JSON Schema)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Currículos gerados via desacoplamento de dados (CandidateProfile) e compilação por Renderer.
          </p>
        </div>

        <Dialog open={isCompileOpen} onOpenChange={setIsCompileOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-500 gap-2">
              <Plus className="h-4 w-4" />
              Compilar Novo Currículo
            </Button>
          </DialogTrigger>
          <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                Compilar Currículo do Perfil Canônico
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Título do Documento (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: CV - Engenheiro de Software Senior"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <p className="text-xs text-slate-400">
                Esta ação absorve os fatos do seu <code className="text-emerald-300">CandidateProfile</code> e
                gera uma instância <code className="text-emerald-300">ResumeDocument</code> inicial com versão 1.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setIsCompileOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCompile}
                  disabled={compiling}
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  {compiling ? "Compilando..." : "Compilar Agora"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Currículos */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Carregando currículos compilados...</div>
      ) : resumes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">Nenhum currículo compilado ainda</h3>
          <p className="text-xs text-slate-500 mt-1">
            Clique no botão acima para compilar seu primeiro currículo estruturado a partir do CandidateProfile.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition-all hover:border-slate-700"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-100 text-sm truncate">{resume.title}</h3>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                    v{resume.currentVersion}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-2 font-mono">
                  Atualizado em: {new Date(resume.updatedAt).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openResume(resume.id)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5 text-emerald-400" />
                  Visualizar & Histórico
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(resume.id)}
                  className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer do Editor / Viewer */}
      <Sheet open={!!selectedResumeId} onOpenChange={(open) => !open && setSelectedResumeId(null)}>
        <SheetContent className="w-full sm:max-w-2xl border-slate-800 bg-slate-950 text-slate-100 p-0 overflow-y-auto">
          {activeDoc && (
            <div className="p-6 space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between pr-6">
                  <div>
                    <SheetTitle className="text-lg font-bold text-slate-100">{activeDoc.title}</SheetTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ID: <code className="text-emerald-300">{activeDoc.id}</code> | Versão Canônica: v
                      {activeDoc.meta?.version || 1}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="bg-slate-900 border border-slate-800 w-full justify-start gap-1 p-1">
                  <TabsTrigger value="preview" className="text-xs gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-emerald-400" />
                    HTML Preview
                  </TabsTrigger>
                  <TabsTrigger value="latex" className="text-xs gap-1.5">
                    <Code className="h-3.5 w-3.5 text-blue-400" />
                    LaTeX Output
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs gap-1.5">
                    <History className="h-3.5 w-3.5 text-amber-400" />
                    Versões ({versions.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-2 overflow-x-auto">
                    <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
                  </div>
                </TabsContent>

                <TabsContent value="latex" className="mt-4 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Código LaTeX compilável (`moderncv`):</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(latexCode)
                        alert("Código LaTeX copiado para a área de transferência!")
                      }}
                      className="border-slate-800 text-xs h-7 gap-1"
                    >
                      Copiar LaTeX
                    </Button>
                  </div>
                  <pre className="p-4 rounded-lg bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto max-h-96 border border-slate-800">
                    {latexCode}
                  </pre>
                </TabsContent>

                <TabsContent value="history" className="mt-4 space-y-3">
                  <div className="text-xs text-slate-400 mb-2">
                    Histórico de edições e alterações por JSON Patch (RFC 6902):
                  </div>
                  {versions.map((ver) => (
                    <div
                      key={ver.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="text-emerald-400">v{ver.versionNumber}</span>
                          <span className="text-slate-300">— {ver.changeSummary}</span>
                        </div>
                        <div className="text-slate-500 flex gap-3 text-[11px]">
                          <span>Autor: {ver.author}</span>
                          <span>Data: {new Date(ver.createdAt).toLocaleString("pt-BR")}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRollback(ver.versionNumber)}
                        className="border-slate-700 text-amber-400 hover:bg-amber-950/30 text-xs gap-1 h-7"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reverter
                      </Button>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
