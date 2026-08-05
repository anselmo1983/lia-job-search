"use client"

import { useState, useEffect } from "react"
import {
  TrendingUp,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  Target,
  BarChart3,
  Check,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface GapSkill {
  skill: string
  category: string
  demandCount: number
  demandPercentage: number
  impactOnMatch: number
  estimatedHours: number
  difficultyLevel: string
}

interface RoadmapItem {
  id: string
  skill: string
  title: string
  description: string
  actionItems: string[]
  suggestedProject: string
  estimatedHours: number
}

interface UpskillReport {
  totalJobsAnalyzed: number
  overallSkillCoverage: number
  gapSkills: GapSkill[]
  roadmap: RoadmapItem[]
}

export function UpskillManager() {
  const [report, setReport] = useState<UpskillReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({})

  const loadUpskillReport = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/upskill")
      const data = await res.json()
      if (data.upskillReport) setReport(data.upskillReport)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUpskillReport()
  }, [])

  const toggleAction = (actionId: string) => {
    setCheckedActions((prev) => ({ ...prev, [actionId]: !prev[actionId] }))
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-400">Analisando lacunas de habilidades do mercado...</div>
  }

  if (!report) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Nenhuma vaga encontrada no banco para análise de lacunas.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Cobertura Geral de Habilidades</span>
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">{report.overallSkillCoverage}%</div>
          <Progress value={report.overallSkillCoverage} className="h-1.5 mt-2 bg-slate-800" />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Vagas Analisadas</span>
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-400">{report.totalJobsAnalyzed}</div>
          <p className="text-[11px] text-slate-500 mt-1">Requisitos extraídos do Inbox</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Lacunas Prioritárias</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">{report.gapSkills.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Habilidades em alta demanda</p>
        </div>
      </div>

      {/* Grid Principal: Lacunas & Roadmap */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lacunas de Habilidades em Alta Demanda */}
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            Lacunas de Habilidades Priorizadas pelo Mercado
          </h3>

          <div className="space-y-3">
            {report.gapSkills.length === 0 ? (
              <p className="text-xs text-slate-500">Parabéns! Seu perfil cobre todas as habilidades requisitadas.</p>
            ) : (
              report.gapSkills.map((gap) => (
                <div
                  key={gap.skill}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">{gap.skill}</span>
                      <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                        {gap.category}
                      </Badge>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                      +{gap.impactOnMatch}% Match Rate
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Presente em <strong>{gap.demandCount}</strong> vaga(s) ({gap.demandPercentage}%)
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3 text-slate-500" />
                      ~{gap.estimatedHours}h ({gap.difficultyLevel})
                    </span>
                  </div>

                  <Progress value={gap.demandPercentage} className="h-1 bg-slate-800" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Roadmap de Aprendizado Personalizado */}
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-400" />
            Plano de Ação de Aprendizado & Projetos
          </h3>

          <div className="space-y-4">
            {report.roadmap.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-100">{item.title}</h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">{item.description}</p>
                  </div>
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[10px] shrink-0">
                    {item.estimatedHours} horas
                  </Badge>
                </div>

                <div className="space-y-1.5 border-t border-slate-800/80 pt-2">
                  <span className="font-semibold text-slate-300 block">Etapas Recomendadas:</span>
                  {item.actionItems.map((act, i) => {
                    const actKey = `${item.id}-${i}`
                    const isChecked = !!checkedActions[actKey]
                    return (
                      <button
                        key={i}
                        onClick={() => toggleAction(actKey)}
                        className="flex items-center gap-2 text-left text-slate-400 hover:text-slate-200 transition w-full"
                      >
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            isChecked ? "bg-emerald-600 border-emerald-500 text-white" : "border-slate-700 bg-slate-950"
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                        <span className={isChecked ? "line-through opacity-60" : ""}>{act}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="rounded bg-slate-950 p-2.5 text-[11px] text-emerald-300 font-mono border border-slate-800/60">
                  ⚡ {item.suggestedProject}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
