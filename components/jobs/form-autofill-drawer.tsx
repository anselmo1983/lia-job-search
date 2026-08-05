"use client"

import { useState } from "react"
import {
  Sparkles,
  Copy,
  Check,
  Zap,
  Save,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Code,
  FileSpreadsheet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FilledField {
  fieldId: string
  fieldName: string
  label: string
  suggestedValue: string
  characterCount: number
  isOverLimit: boolean
  confidenceScore?: number
  matchType?: string
}

interface FormAutoFillDrawerProps {
  jobId?: string
  jobTitle?: string
  company?: string
  trigger?: React.ReactNode
}

export function FormAutoFillDrawer({ jobId, jobTitle, company, trigger }: FormAutoFillDrawerProps) {
  const [open, setOpen] = useState(false)
  const [rawHtml, setRawHtml] = useState("")
  const [loading, setLoading] = useState(false)
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null)

  const [autofillResult, setAutofillResult] = useState<{
    summary?: {
      totalFields: number
      filledFields: number
      coveragePercentage: number
      averageConfidence: number
    }
    fields?: FilledField[]
  } | null>(null)

  // Estado para salvar nova pergunta no Vault
  const [savingField, setSavingField] = useState<string | null>(null)

  const handleGenerateAutofill = async () => {
    if (!rawHtml.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/apply/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent: rawHtml, jobId }),
      })
      const data = await res.json()
      if (data.success) {
        setAutofillResult(data)
      } else {
        alert(data.error || "Falha ao analisar formulário.")
      }
    } catch (e) {
      console.error("Erro ao gerar auto-fill:", e)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (fieldId: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedFieldId(fieldId)
    setTimeout(() => setCopiedFieldId(null), 2000)
  }

  const handleSaveToVault = async (questionText: string, answerText: string, fieldId: string) => {
    if (!questionText || !answerText) return
    setSavingField(fieldId)
    try {
      const res = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionText, answerText, category: "screener" }),
      })
      const data = await res.json()
      if (data.success) {
        alert("Resposta salva com sucesso no Answer Vault!")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingField(null)
    }
  }

  const getConfidenceBadge = (score?: number) => {
    const s = score || 60
    if (s >= 95) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
          100% Identidade
        </Badge>
      )
    }
    if (s >= 85) {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
          {s}% Vault
        </Badge>
      )
    }
    return (
      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
        {s}% Heurística
      </Badge>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-1.5 border-slate-700 text-slate-300 text-xs">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            Auto-Fill Formulário
          </Button>
        )}
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-2xl border-slate-800 bg-slate-950 text-slate-100 p-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            Form Auto-Fill Engine (Simplify.jobs pattern)
          </SheetTitle>
          <p className="text-xs text-slate-400">
            {jobTitle && company ? `${jobTitle} — ${company}` : "Preenchimento de candidatura automática"}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Passo 1: Colar HTML do Formulário */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Code className="h-4 w-4 text-emerald-400" />
              Cole o HTML ou trecho do formulário (Greenhouse, Gupy, Lever, LinkedIn):
            </label>
            <textarea
              rows={4}
              placeholder="Cole aqui o código HTML da página do formulário ou inspetor de elementos..."
              value={rawHtml}
              onChange={(e) => setRawHtml(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleGenerateAutofill}
                disabled={loading || !rawHtml.trim()}
                className="bg-emerald-600 text-white hover:bg-emerald-500 text-xs gap-1.5"
              >
                {loading ? "Detectando..." : "Detectar & Preencher Campos"}
              </Button>
            </div>
          </div>

          {/* Passo 2: Resultado do Preenchimento */}
          {autofillResult && autofillResult.summary && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center text-xs">
                <div>
                  <div className="text-slate-400">Total de Campos</div>
                  <div className="text-lg font-bold text-slate-100">{autofillResult.summary.totalFields}</div>
                </div>
                <div>
                  <div className="text-slate-400">Cobertura</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {autofillResult.summary.coveragePercentage}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Confiança Média</div>
                  <div className="text-lg font-bold text-blue-400">
                    {autofillResult.summary.averageConfidence}%
                  </div>
                </div>
              </div>

              {/* Lista de Campos Preenchidos */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Campos Mapeados ({autofillResult.fields?.length || 0})
                </h4>

                {autofillResult.fields?.map((field) => (
                  <div
                    key={field.fieldId}
                    className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 truncate">{field.label || field.fieldName}</span>
                      {getConfidenceBadge(field.confidenceScore)}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={field.suggestedValue}
                        className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 font-mono"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(field.fieldId, field.suggestedValue)}
                        className="h-7 w-7 shrink-0 border-slate-700 text-slate-300 hover:text-white"
                      >
                        {copiedFieldId === field.fieldId ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>

                    {/* Botão de Salvar no Vault se for pergunta de triagem */}
                    {field.matchType !== "identity" && field.suggestedValue && (
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleSaveToVault(field.label || field.fieldName, field.suggestedValue, field.fieldId)
                          }
                          disabled={savingField === field.fieldId}
                          className="h-6 text-[11px] text-slate-400 hover:text-emerald-400 gap-1 p-0"
                        >
                          <Save className="h-3 w-3" />
                          Salvar esta resposta no Vault
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
