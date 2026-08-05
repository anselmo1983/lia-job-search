"use client"

import { useState } from "react"
import { Loader2, X, CheckCircle, AlertCircle, FileText, Mail, ClipboardCheck, Copy, Download, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchWithAuth } from "@/lib/auth/client-guard"

type Job = { id: string; title: string; company: string; description?: string; location?: string; url?: string }

export default function JobApplyModal({ job, onClose, onComplete }: { job: Job; onClose: () => void; onComplete?: () => void }) {
  const [step, setStep] = useState<"evaluate" | "review" | "done">("evaluate")
  const [loading, setLoading] = useState(false)
  const [evaluation, setEvaluation] = useState<any>(null)
  const [cv, setCv] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [review, setReview] = useState<any>(null)
  const [error, setError] = useState("")
  const [copiedCv, setCopiedCv] = useState(false)
  const [copiedLetter, setCopiedLetter] = useState(false)

  async function evaluateFit() {
    setLoading(true)
    setError("")
    try {
      const res = await fetchWithAuth("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setEvaluation(data.evaluation)
      setCv(data.finalCv || data.cv || "")
      setCoverLetter(data.coverLetter || "")
      setReview(data.review)
      setStep("review")
    } catch (err) { setError("Erro ao avaliar vaga") }
    setLoading(false)
  }

  async function saveApplication() {
    setLoading(true)
    try {
      if (cv) await fetchWithAuth("/api/cv/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: cv, company: job.company, role: job.title, format: "md" }) })
      await fetchWithAuth("/api/outcome", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: job.company, role: job.title, status: "applied", notes: `Candidatura gerada via UI. Score: ${evaluation?.fitScore || "N/A"}` }) })
      setStep("done")
      if (onComplete) onComplete()
    } catch (err) { setError("Erro ao salvar candidatura") }
    setLoading(false)
  }

  function handleCopy(text: string, type: "cv" | "letter") {
    navigator.clipboard.writeText(text)
    if (type === "cv") {
      setCopiedCv(true)
      setTimeout(() => setCopiedCv(false), 2000)
    } else {
      setCopiedLetter(true)
      setTimeout(() => setCopiedLetter(false), 2000)
    }
  }

  function handleDownload(text: string, filename: string) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const safeCompany = job.company ? job.company.toLowerCase().replace(/[^a-z0-9]/g, "_") : "empresa"
  const safeRole = job.title ? job.title.toLowerCase().replace(/[^a-z0-9]/g, "_") : "vaga"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 pt-10">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{job.title}</h2>
            <p className="text-slate-400">{job.company}{job.location ? ` · ${job.location}` : ""}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-6 flex items-center gap-2 text-sm">
          {["Avaliar Fit", "Revisar Documentos", "Salvar"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${((i === 0 && (step === "evaluate" || step === "review" || step === "done")) || (i === 1 && (step === "review" || step === "done")) || (i === 2 && step === "done")) ? "bg-emerald-400 text-slate-950" : "bg-slate-700 text-slate-300"}`}>
                {step === "done" && i < 2 ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </span>
              <span className={((i === 0 && step === "evaluate") || (i === 1 && step === "review") || (i === 2 && step === "done")) ? "text-emerald-300 font-semibold" : "text-slate-500"}>{s}</span>
              {i < 2 && <span className="text-slate-700">→</span>}
            </div>
          ))}
        </div>
        {error && <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400"><AlertCircle className="h-4 w-4" /> {error}</div>}
        {step === "evaluate" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Vamos avaliar o fit desta vaga com seu perfil usando IA. Isso leva alguns segundos.</p>
            {job.description && <div className="rounded-lg bg-slate-950 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Descrição da vaga</p><p className="text-sm leading-6 text-slate-400 line-clamp-6">{job.description}</p></div>}
            <Button onClick={evaluateFit} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}{loading ? "Avaliando..." : "Avaliar Fit e Gerar Documentos"}</Button>
          </div>
        )}
        {step === "review" && (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {evaluation && (
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Score de Fit</h3><span className={`text-2xl font-bold ${(evaluation.fitScore || 0) >= 70 ? "text-emerald-400" : (evaluation.fitScore || 0) >= 40 ? "text-amber-400" : "text-red-400"}`}>{evaluation.fitScore || "—"}%</span></div>
                {evaluation.verdict && <p className="text-sm text-slate-400">{evaluation.verdict}</p>}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {evaluation.strengths?.length > 0 && <div><p className="mb-2 text-xs font-semibold text-emerald-400">✅ Pontos Fortes</p><ul className="space-y-1">{evaluation.strengths.map((s: string, i: number) => <li key={i} className="text-xs text-slate-400">• {s}</li>)}</ul></div>}
                  {evaluation.gaps?.length > 0 && <div><p className="mb-2 text-xs font-semibold text-amber-400">⚠️ Pontos de Atenção</p><ul className="space-y-1">{evaluation.gaps.map((g: string, i: number) => <li key={i} className="text-xs text-slate-400">• {g}</li>)}</ul></div>}
                </div>
              </div>
            )}
            {review && (
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <div className="flex items-center gap-2 mb-2"><ClipboardCheck className="h-4 w-4 text-emerald-400" /><h3 className="font-semibold">Score ATS: {review.atsScore || "—"}/100</h3></div>
                {review.issues?.length > 0 && <div className="mt-2 space-y-1">{review.issues.map((issue: any, i: number) => <p key={i} className={`text-xs ${issue.severity === "high" ? "text-red-400" : "text-amber-400"}`}>• {issue.item}: {issue.suggestion}</p>)}</div>}
              </div>
            )}
            {cv && (
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-400" />
                    <h3 className="font-semibold">Currículo Adaptado</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(cv, "cv")}>
                      {copiedCv ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedCv ? "Copiado!" : "Copiar"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(cv, `cv_${safeCompany}_${safeRole}.md`)}>
                      <Download className="h-3.5 w-3.5" /> Baixar .md
                    </Button>
                  </div>
                </div>
                <pre className="max-h-60 overflow-y-auto text-xs leading-5 text-slate-400 whitespace-pre-wrap">{cv}</pre>
              </div>
            )}
            {coverLetter && (
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-emerald-400" />
                    <h3 className="font-semibold">Carta de Apresentação</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(coverLetter, "letter")}>
                      {copiedLetter ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedLetter ? "Copiada!" : "Copiar"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(coverLetter, `carta_${safeCompany}_${safeRole}.md`)}>
                      <Download className="h-3.5 w-3.5" /> Baixar .md
                    </Button>
                  </div>
                </div>
                <pre className="max-h-40 overflow-y-auto text-xs leading-5 text-slate-400 whitespace-pre-wrap">{coverLetter}</pre>
              </div>
            )}
            <Button onClick={saveApplication} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}{loading ? "Salvando..." : "Confirmar e Salvar Candidatura"}</Button>
          </div>
        )}
        {step === "done" && <div className="py-8 text-center"><CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-400" /><h2 className="text-xl font-bold">Candidatura Registrada!</h2><p className="mt-2 text-slate-400">Currículo adaptado e candidatura gravados com sucesso.</p><Button className="mt-6" onClick={onClose}>Fechar</Button></div>}
      </div>
    </div>
  )
}
