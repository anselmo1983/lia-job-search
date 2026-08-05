"use client"

import { useState, useEffect } from "react"
import {
  Award,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  FileText,
  Code,
  Copy,
  Check,
  RefreshCw,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AtsKeywordDetail {
  keyword: string
  matched: boolean
  category: string
}

interface AtsReportData {
  matchScore: number
  matchedKeywords: string[]
  missingKeywords: string[]
  keywordCoverageDetails: AtsKeywordDetail[]
  suggestedPatches?: Array<{ keyword: string; patch: any }>
}

interface AtsReportDrawerProps {
  jobId?: string
  jobTitle?: string
  company?: string
  jobDescription?: string
  trigger?: React.ReactNode
}

export function AtsReportDrawer({
  jobId,
  jobTitle,
  company,
  jobDescription,
  trigger,
}: AtsReportDrawerProps) {
  const [open, setOpen] = useState(false)
  const [loadingAts, setLoadingAts] = useState(false)
  const [loadingLetter, setLoadingLetter] = useState(false)
  const [atsReport, setAtsReport] = useState<AtsReportData | null>(null)
  const [resumes, setResumes] = useState<Array<{ id: string; title: string }>>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string>("")
  const [copiedLatex, setCopiedLatex] = useState(false)

  // Cover Letter States
  const [coverLetterHtml, setCoverLetterHtml] = useState<string>("")
  const [coverLetterLatex, setCoverLetterLatex] = useState<string>("")

  const loadResumes = async () => {
    try {
      const res = await fetch("/api/resumes")
      const data = await res.json()
      if (data.resumes && data.resumes.length > 0) {
        setResumes(data.resumes)
        setSelectedResumeId(data.resumes[0].id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (open) loadResumes()
  }, [open])

  const calculateAts = async () => {
    if (!selectedResumeId) return
    setLoadingAts(true)
    try {
      const res = await fetch(`/api/resumes/${selectedResumeId}/ats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, jobDescription }),
      })
      const data = await res.json()
      if (data.success) {
        setAtsReport(data.atsReport)
      } else {
        alert(data.error || "Falha ao calcular ATS.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingAts(false)
    }
  }

  const handleApply1ClickPatch = async (kw: string, patch: any) => {
    if (!selectedResumeId) return
    try {
      const res = await fetch(`/api/resumes/${selectedResumeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patches: [patch],
          changeSummary: `Adicionada palavra-chave ATS: ${kw}`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`Palavra-chave '${kw}' adicionada ao currículo com sucesso!`)
        calculateAts()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleGenerateCoverLetter = async () => {
    if (!jobTitle || !company) return
    setLoadingLetter(true)
    try {
      const res = await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, title: jobTitle, company, description: jobDescription }),
      })
      const data = await res.json()
      if (data.success) {
        setCoverLetterHtml(data.renderings.html)
        setCoverLetterLatex(data.renderings.latex)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingLetter(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
    if (score >= 60) return "text-blue-400 border-blue-500/40 bg-blue-500/10"
    return "text-amber-400 border-amber-500/40 bg-amber-500/10"
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-1.5 border-slate-700 text-slate-300 text-xs">
            <Award className="h-3.5 w-3.5 text-amber-400" />
            Relatório ATS & Carta
          </Button>
        )}
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-2xl border-slate-800 bg-slate-950 text-slate-100 p-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            Otimização ATS & Carta de Apresentação
          </SheetTitle>
          <p className="text-xs text-slate-400">
            {jobTitle && company ? `${jobTitle} — ${company}` : "Análise comparativa de palavras-chave"}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Seletor de Currículo Compilado */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <Layers className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Selecione o Currículo Compilado para Análise:
              </label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              onClick={calculateAts}
              disabled={loadingAts || !selectedResumeId}
              className="bg-emerald-600 text-white hover:bg-emerald-500 text-xs gap-1 self-end h-8"
            >
              {loadingAts ? "Analisando..." : "Analisar ATS"}
            </Button>
          </div>

          <Tabs defaultValue="ats" className="w-full">
            <TabsList className="bg-slate-900 border border-slate-800 w-full justify-start gap-1 p-1">
              <TabsTrigger value="ats" className="text-xs gap-1.5">
                <Award className="h-3.5 w-3.5 text-amber-400" />
                Score & Palavras-Chave
              </TabsTrigger>
              <TabsTrigger
                value="letter"
                onClick={() => !coverLetterHtml && handleGenerateCoverLetter()}
                className="text-xs gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                Carta de Apresentação
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: Relatório ATS */}
            <TabsContent value="ats" className="mt-4 space-y-4">
              {atsReport ? (
                <>
                  {/* Gauge de Score */}
                  <div
                    className={`flex items-center justify-between rounded-xl border p-4 ${getScoreColor(
                      atsReport.matchScore
                    )}`}
                  >
                    <div>
                      <h3 className="font-bold text-sm">Aderência ATS ao Anúncio</h3>
                      <p className="text-xs opacity-80">
                        {atsReport.matchScore >= 80
                          ? "Excelente! Altas chances de aprovação no filtro automatizado."
                          : "Boa cobertura. Adicione as palavras-chave ausentes para atingir 90%+"}
                      </p>
                    </div>
                    <div className="text-3xl font-black">{atsReport.matchScore}%</div>
                  </div>

                  {/* Palavras-chave Ausentes com 1-Click Patch */}
                  {atsReport.missingKeywords.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Palavras-Chave Ausentes (Clique para Adicionar)
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {atsReport.suggestedPatches?.map((sp) => (
                          <button
                            key={sp.keyword}
                            onClick={() => handleApply1ClickPatch(sp.keyword, sp.patch)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-amber-300 hover:border-amber-500/50 hover:bg-amber-950/20 transition"
                          >
                            <Plus className="h-3 w-3" />
                            <span>{sp.keyword}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Palavras-chave Encontradas */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Palavras-Chave Encontradas no Currículo ({atsReport.matchedKeywords.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {atsReport.matchedKeywords.map((kw) => (
                        <Badge
                          key={kw}
                          className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[11px]"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  Clique em &quot;Analisar ATS&quot; para comparar o currículo selecionado com o anúncio da vaga.
                </div>
              )}
            </TabsContent>

            {/* ABA 2: Carta de Apresentação */}
            <TabsContent value="letter" className="mt-4 space-y-4">
              {loadingLetter ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Compilando Carta de Apresentação Personalizada...
                </div>
              ) : coverLetterHtml ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Preview da Carta Compilada:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(coverLetterLatex)
                        setCopiedLatex(true)
                        setTimeout(() => setCopiedLatex(false), 2000)
                      }}
                      className="border-slate-800 text-xs h-7 gap-1"
                    >
                      {copiedLatex ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      Copiar LaTeX
                    </Button>
                  </div>

                  <div dangerouslySetInnerHTML={{ __html: coverLetterHtml }} />
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  Nenhuma carta compilada ainda.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
