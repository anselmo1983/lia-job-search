import { PageHeader } from "@/components/app-shell"
import { InterviewManager } from "@/components/interviews/interview-manager"
import { InterviewCalendar } from "@/components/local-trackers"

export const dynamic = "force-dynamic"
export const metadata = { title: "Interview Calendar & Prep" }

export default function CalendarPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Cronograma de Entrevistas & Simulador IA"
        description="Agendamento de etapas de entrevista e geração de guias de preparação comportamental (Método STAR) e técnica."
      />

      {/* Componente Interativo de Entrevistas com SQLite & IA */}
      <InterviewManager />

      {/* Calendário Local Legado */}
      <div className="pt-4 border-t border-slate-800/80 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">Calendário Rápido Local</h2>
        <InterviewCalendar />
      </div>
    </div>
  )
}
