"use client"

import { useState, useEffect } from "react"
import {
  X,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Bot,
  ArrowRight,
  Loader2,
  FileText,
  Bookmark,
  Send,
  Briefcase,
  Award,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { fetchWithAuth } from "@/lib/auth/client-guard"
import { FormAutoFillDrawer } from "@/components/jobs/form-autofill-drawer"
import { AtsReportDrawer } from "@/components/jobs/ats-report-drawer"


export type JobPreviewData = {
  id: string
  title: string
  company: string
  location: string
  url: string
  description?: string
  status: string
  fit?: string
  score?: number | null
  strengths?: string[] | string
  gaps?: string[] | string
  reasoning?: string
  date?: string
  published_at?: string
  subScores?: {
    skillScore: number
    titleScore: number
    locationScore: number
    sectorScore: number
  }
}

type HistoryItem = {
  id: string
  jobId: string
  fromStatus: string | null
  toStatus: string
  actor: string
  notes: string | null
  createdAt: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  discovered: { label: "Descoberta", color: "bg-slate-800 text-slate-300 border-slate-700" },
  bookmarked: { label: "Salva", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  ranking: { label: "Em Análise", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  tailored: { label: "CV Adaptado", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  applied: { label: "Candidatado", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  interviewing: { label: "Em Entrevista", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  offer: { label: "Proposta", color: "bg-emerald-400 text-slate-950 border-emerald-300 font-bold" },
  rejected: { label: "Recusado", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  archived: { label: "Arquivado", color: "bg-slate-900 text-slate-500 border-slate-800" },
}

interface JobPreviewDrawerProps {
  job: JobPreviewData | null
  isOpen: boolean
  onClose: () => void
  onStatusChange?: (jobId: string, newStatus: string) => void
  onOpenApplyModal?: (job: JobPreviewData) => void
}

export function JobPreviewDrawer({
  job,
  isOpen,
  onClose,
  onStatusChange,
  onOpenApplyModal,
}: JobPreviewDrawerProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (job?.id && isOpen) {
      loadHistory(job.id)
    }
  }, [job?.id, isOpen])

  async function loadHistory(jobId: string) {
    setLoadingHistory(true)
    try {
      const res = await fetchWithAuth(`/api/jobs/${jobId}/history`)
      const data = await res.json()
      if (data.history) {
        setHistory(data.history)
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err)
    }
    setLoadingHistory(false)
  }

  async function handleStatusTransition(toStatus: string) {
    if (!job?.id || updatingStatus) return
    setUpdatingStatus(true)
    try {
      const res = await fetchWithAuth(`/api/jobs/${job.id}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus, actor: "user", notes: `Alterado via Job Preview Drawer` }),
      })
      const data = await res.json()
      if (data.success) {
        if (onStatusChange) onStatusChange(job.id, toStatus)
        await loadHistory(job.id)
      }
    } catch (err) {
      console.error("Erro ao transicionar status:", err)
    }
    setUpdatingStatus(false)
  }

  if (!isOpen || !job) return null

  const parseJsonArray = (val: string[] | string | undefined): string[] => {
    if (!val) return []
    if (Array.isArray(val)) return val
    try {
      return JSON.parse(val)
    } catch {
      return [val]
    }
  }

  const strengthsList = parseJsonArray(job.strengths)
  const gapsList = parseJsonArray(job.gaps)
  const currentStatusObj = STATUS_LABELS[job.status] || { label: job.status, color: "bg-slate-800 text-slate-300 border-slate-700" }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm transition-opacity">
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-slate-800 bg-slate-900 text-slate-100 shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Header Drawer */}
        <div className="flex items-center justify-between border-b border-slate-800 p-6 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              <Briefcase className="h-5 w-5 text-emerald-400" />
            </span>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Job Preview & Score Report</span>
              <h2 className="text-lg font-bold text-white line-clamp-1">{job.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Banner de Info da Empresa & Ações Rápidas */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">{job.company}</h3>
                <p className="mt-1 text-sm text-slate-400">{job.location || "Local não especificado"}</p>
                {(job.published_at || job.date) && (
                  <p className="mt-1 text-xs text-slate-500">Publicado em: {job.published_at || job.date}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${currentStatusObj.color}`}>
                  {currentStatusObj.label}
                </span>

                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
                  >
                    <span>Ver no Portal</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Ações de Estado */}
            <div className="mt-5 border-t border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium mr-1">Mudar Estado:</span>
                {["bookmarked", "tailored", "applied", "interviewing", "offer", "rejected"].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusTransition(st)}
                    disabled={updatingStatus || job.status === st}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                      job.status === st
                        ? "bg-emerald-400/20 text-emerald-300 border-emerald-400/40"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {STATUS_LABELS[st]?.label || st}
                  </button>
                ))}
              </div>

              {onOpenApplyModal && (
                <div className="flex flex-wrap items-center gap-2">
                  <AtsReportDrawer jobId={job.id} jobTitle={job.title} company={job.company} jobDescription={job.description} />
                  <FormAutoFillDrawer jobId={job.id} jobTitle={job.title} company={job.company} />
                  <Button
                    size="sm"
                    onClick={() => onOpenApplyModal(job)}
                    className="gap-1.5 bg-emerald-400 text-slate-950 hover:bg-emerald-300 font-semibold text-xs"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Gerar Candidatura (/apply)</span>
                  </Button>
                </div>
              )}

            </div>

          </div>

          {/* SCORE REPORT CARD */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                <h4 className="font-bold text-white text-base">Score Report & Fit Analysis</h4>
              </div>
              {job.score !== null && job.score !== undefined ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-emerald-400">{job.score}</span>
                  <span className="text-xs text-slate-500 font-medium">/ 100</span>
                </div>
              ) : (
                <Badge variant="outline" className="text-xs text-slate-400 border-slate-800">
                  Não Classificado
                </Badge>
              )}
            </div>

            {/* Sub-Scores Progress */}
            {job.subScores && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Skill Match (40%)</span>
                    <span className="text-emerald-400 font-semibold">{job.subScores.skillScore}%</span>
                  </div>
                  <Progress value={job.subScores.skillScore} className="h-1.5 bg-slate-800" />
                </div>

                <div className="space-y-1 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Cargo & Título (30%)</span>
                    <span className="text-blue-400 font-semibold">{job.subScores.titleScore}%</span>
                  </div>
                  <Progress value={job.subScores.titleScore} className="h-1.5 bg-slate-800" />
                </div>

                <div className="space-y-1 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Localização & Modo (20%)</span>
                    <span className="text-purple-400 font-semibold">{job.subScores.locationScore}%</span>
                  </div>
                  <Progress value={job.subScores.locationScore} className="h-1.5 bg-slate-800" />
                </div>

                <div className="space-y-1 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Setor Target (10%)</span>
                    <span className="text-amber-400 font-semibold">{job.subScores.sectorScore}%</span>
                  </div>
                  <Progress value={job.subScores.sectorScore} className="h-1.5 bg-slate-800" />
                </div>
              </div>
            )}

            {/* Strengths & Gaps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Pontos Fortes ({strengthsList.length})</span>
                </h5>
                {strengthsList.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {strengthsList.map((st, i) => (
                      <li key={i} className="flex items-start gap-1.5 bg-emerald-400/5 p-2 rounded-lg border border-emerald-400/10">
                        <ChevronRight className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">Nenhum ponto forte destacado.</p>
                )}
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Gaps & Lacunas ({gapsList.length})</span>
                </h5>
                {gapsList.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {gapsList.map((gp, i) => (
                      <li key={i} className="flex items-start gap-1.5 bg-amber-400/5 p-2 rounded-lg border border-amber-400/10">
                        <ChevronRight className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{gp}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">Nenhum gap crítico mapeado.</p>
                )}
              </div>
            </div>

            {/* Reasoning */}
            {job.reasoning && (
              <div className="pt-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Justificativa da Inteligência</h5>
                <p className="text-xs text-slate-300 bg-slate-900 p-3 rounded-xl border border-slate-800 leading-relaxed">
                  {job.reasoning}
                </p>
              </div>
            )}
          </div>

          {/* PREVIEW DA DESCRIÇÃO */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              <h4 className="font-bold text-white text-base">Descrição Completa do Anúncio</h4>
            </div>

            {job.description ? (
              <div className="text-xs text-slate-300 leading-relaxed space-y-2 max-h-96 overflow-y-auto pr-2 font-mono whitespace-pre-wrap bg-slate-900 p-4 rounded-xl border border-slate-800">
                {job.description}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Descrição detalhada não disponível para esta vaga.</p>
            )}
          </div>

          {/* AUDIT LOG DE TRANSIÇÃO DE STATUS */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-400" />
                <h4 className="font-bold text-white text-base">Histórico de Transições (Audit Log)</h4>
              </div>
              <span className="text-xs text-slate-500">{history.length} eventos</span>
            </div>

            {loadingHistory ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Sem eventos de transição registrados.</p>
            ) : (
              <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {history.map((h) => {
                  const fromObj = h.fromStatus ? STATUS_LABELS[h.fromStatus]?.label || h.fromStatus : "Início"
                  const toObj = STATUS_LABELS[h.toStatus]?.label || h.toStatus
                  return (
                    <div key={h.id} className="relative flex flex-col gap-1 text-xs">
                      <div className="absolute -left-4 top-1 h-3 w-3 rounded-full bg-purple-500 ring-4 ring-slate-950" />
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{fromObj}</span>
                        <ArrowRight className="h-3 w-3 text-slate-600" />
                        <span className="font-bold text-purple-400">{toObj}</span>
                        <span className="text-[10px] text-slate-500 ml-auto">{new Date(h.createdAt).toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        {h.actor === "agent" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">
                            <Bot className="h-3 w-3" /> Agente AI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                            <User className="h-3 w-3" /> Usuário
                          </span>
                        )}
                        {h.notes && <span className="italic text-slate-400">{h.notes}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
