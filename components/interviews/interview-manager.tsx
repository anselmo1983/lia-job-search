"use client"

import { useState, useEffect } from "react"
import {
  Calendar as CalendarIcon,
  Plus,
  Sparkles,
  Clock,
  Video,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Trash2,
  ChevronRight,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface InterviewItem {
  id: string
  company: string
  role: string
  interviewType: "screening" | "technical" | "cultural" | "system_design" | "final"
  scheduledAt: string
  locationOrLink?: string
  status: "scheduled" | "completed" | "canceled"
  notes?: string
  prepGuide?: {
    technicalQuestions: Array<{ question: string; keyTalkingPoints: string[] }>
    starBehavioralAnswers: Array<{
      question: string
      situation: string
      task: string
      action: string
      result: string
    }>
    questionsToAskInterviewer: string[]
    companyResearchTips: string[]
  }
}

export function InterviewManager() {
  const [interviews, setInterviews] = useState<InterviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInterview, setSelectedInterview] = useState<InterviewItem | null>(null)
  const [generatingPrep, setGeneratingPrep] = useState(false)

  // Form states
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [interviewType, setInterviewType] = useState<InterviewItem["interviewType"]>("technical")
  const [scheduledAt, setScheduledAt] = useState("")
  const [locationOrLink, setLocationOrLink] = useState("")
  const [notes, setNotes] = useState("")
  const [generatePrep, setGeneratePrep] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadInterviews = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/interviews")
      const data = await res.json()
      if (data.interviews) setInterviews(data.interviews)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInterviews()
  }, [])

  const handleCreate = async () => {
    if (!company || !role || !scheduledAt) {
      alert("Preencha os campos obrigatórios (Empresa, Cargo, Data/Hora).")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          role,
          interviewType,
          scheduledAt,
          locationOrLink,
          notes,
          generatePrep,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setIsNewOpen(false)
        setCompany("")
        setRole("")
        setScheduledAt("")
        setLocationOrLink("")
        setNotes("")
        loadInterviews()
      } else {
        alert(data.error || "Falha ao agendar entrevista.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleGeneratePrep = async (id: string) => {
    setGeneratingPrep(true)
    try {
      const res = await fetch(`/api/interviews/${id}/prep`, { method: "POST" })
      const data = await res.json()
      if (data.success) {
        setSelectedInterview(data.interview)
        loadInterviews()
      } else {
        alert(data.error || "Falha ao gerar Guia de Preparação.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGeneratingPrep(false)
    }
  }

  const handleStatusChange = async (id: string, status: InterviewItem["status"]) => {
    try {
      const res = await fetch(`/api/interviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        loadInterviews()
        if (selectedInterview?.id === id) {
          setSelectedInterview((prev) => (prev ? { ...prev, status } : null))
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta entrevista?")) return
    try {
      const res = await fetch(`/api/interviews/${id}`, { method: "DELETE" })
      if (res.ok) {
        if (selectedInterview?.id === id) setSelectedInterview(null)
        loadInterviews()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const getStatusBadge = (status: InterviewItem["status"]) => {
    if (status === "completed") {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
          Concluída
        </Badge>
      )
    }
    if (status === "canceled") {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
          Cancelada
        </Badge>
      )
    }
    return (
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
        Agendada
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-emerald-400" />
            Cronograma de Entrevistas & Guia de Preparação IA
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerenciamento de reuniões de triagem, entrevistas técnicas e simulação com Método STAR.
          </p>
        </div>

        <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-500 gap-2">
              <Plus className="h-4 w-4" />
              Agendar Entrevista
            </Button>
          </DialogTrigger>
          <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-emerald-400" />
                Agendar Nova Entrevista
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Empresa *</label>
                  <input
                    type="text"
                    placeholder="Ex: Google, Nubank"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Cargo *</label>
                  <input
                    type="text"
                    placeholder="Ex: Senior Backend Developer"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Tipo de Entrevista</label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value as any)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100"
                  >
                    <option value="screening">Triagem / Recrutador</option>
                    <option value="technical">Técnica / Live Coding</option>
                    <option value="system_design">System Design</option>
                    <option value="cultural">Fit Cultural / Liderança</option>
                    <option value="final">Etapa Final / Proposta</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Data e Hora *</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Link ou Local da Reunião</label>
                <input
                  type="text"
                  placeholder="Ex: https://meet.google.com/abc-defg-hij"
                  value={locationOrLink}
                  onChange={(e) => setLocationOrLink(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Anotações / Contexto</label>
                <textarea
                  rows={2}
                  placeholder="Instruções recebidas do recrutador..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="genPrep"
                  checked={generatePrep}
                  onChange={(e) => setGeneratePrep(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500"
                />
                <label htmlFor="genPrep" className="text-slate-300 cursor-pointer">
                  Gerar automaticamente Guia de Preparação IA (Perguntas STAR + Técnicas)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button variant="ghost" onClick={() => setIsNewOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  {submitting ? "Agendando..." : "Confirmar Agendamento"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Entrevistas */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Carregando entrevistas...</div>
      ) : interviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
          <CalendarIcon className="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">Nenhuma entrevista agendada</h3>
          <p className="text-xs text-slate-500 mt-1">
            Agende suas entrevistas para gerar simulados e guias no método STAR com IA.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {interviews.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-slate-700"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">{item.role}</h3>
                    <p className="text-xs font-semibold text-emerald-400">{item.company}</p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span>{new Date(item.scheduledAt).toLocaleString("pt-BR")}</span>
                  </div>
                  {item.locationOrLink && (
                    <div className="flex items-center gap-1.5 font-mono truncate text-blue-400">
                      <Video className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <a href={item.locationOrLink} target="_blank" className="hover:underline truncate">
                        {item.locationOrLink}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedInterview(item)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
                >
                  <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                  Guia de Preparação IA
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(item.id)}
                  className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer Guia de Preparação IA */}
      <Sheet open={!!selectedInterview} onOpenChange={(o) => !o && setSelectedInterview(null)}>
        <SheetContent className="w-full sm:max-w-2xl border-slate-800 bg-slate-950 text-slate-100 p-6 overflow-y-auto">
          {selectedInterview && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between pr-6">
                  <div>
                    <SheetTitle className="text-lg font-bold text-slate-100">
                      {selectedInterview.role} — {selectedInterview.company}
                    </SheetTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Data: {new Date(selectedInterview.scheduledAt).toLocaleString("pt-BR")} | Tipo:{" "}
                      <span className="text-emerald-400 uppercase font-mono">{selectedInterview.interviewType}</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(selectedInterview.id, "completed")}
                      className="text-xs h-7 border-emerald-500/40 text-emerald-400"
                    >
                      Concluída
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {selectedInterview.prepGuide ? (
                <Tabs defaultValue="star" className="w-full">
                  <TabsList className="bg-slate-900 border border-slate-800 w-full justify-start gap-1 p-1">
                    <TabsTrigger value="star" className="text-xs gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                      Método STAR ({selectedInterview.prepGuide.starBehavioralAnswers.length})
                    </TabsTrigger>
                    <TabsTrigger value="technical" className="text-xs gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                      Perguntas Técnicas
                    </TabsTrigger>
                    <TabsTrigger value="to_ask" className="text-xs gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
                      Perguntas para Recrutador
                    </TabsTrigger>
                  </TabsList>

                  {/* Método STAR */}
                  <TabsContent value="star" className="mt-4 space-y-4">
                    <div className="text-xs text-slate-400 mb-2">
                      Respostas comportamentais estruturadas com base nos seus fatos reais do CandidateProfile:
                    </div>
                    {selectedInterview.prepGuide.starBehavioralAnswers.map((star, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2 text-xs"
                      >
                        <h4 className="font-bold text-slate-100 text-sm">❓ {star.question}</h4>
                        <div className="grid gap-2 border-t border-slate-800/80 pt-2 text-slate-300">
                          <div>
                            <strong className="text-emerald-400">Situação (S):</strong> {star.situation}
                          </div>
                          <div>
                            <strong className="text-blue-400">Tarefa (T):</strong> {star.task}
                          </div>
                          <div>
                            <strong className="text-amber-400">Ação (A):</strong> {star.action}
                          </div>
                          <div>
                            <strong className="text-purple-400">Resultado (R):</strong> {star.result}
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  {/* Perguntas Técnicas */}
                  <TabsContent value="technical" className="mt-4 space-y-3">
                    {selectedInterview.prepGuide.technicalQuestions.map((t, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-800 bg-slate-900 p-3 space-y-2 text-xs">
                        <h4 className="font-semibold text-slate-200">{t.question}</h4>
                        <ul className="list-disc list-inside text-slate-400 space-y-1">
                          {t.keyTalkingPoints.map((tp, i) => (
                            <li key={i}>{tp}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </TabsContent>

                  {/* Perguntas para Fazer */}
                  <TabsContent value="to_ask" className="mt-4 space-y-2">
                    {selectedInterview.prepGuide.questionsToAskInterviewer.map((q, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-3 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-200 font-medium"
                      >
                        <ChevronRight className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{q}</span>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="py-8 text-center space-y-3">
                  <p className="text-xs text-slate-400">Nenhum Guia de Preparação gerado ainda para esta entrevista.</p>
                  <Button
                    onClick={() => handleGeneratePrep(selectedInterview.id)}
                    disabled={generatingPrep}
                    className="bg-emerald-600 text-white text-xs gap-1.5"
                  >
                    <Sparkles className="h-4 w-4" />
                    {generatingPrep ? "Gerando Guia..." : "Gerar Guia de Preparação IA"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
