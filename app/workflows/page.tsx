import Link from "next/link"
import {
  UserCheck,
  Search,
  Star,
  FileCheck,
  ClipboardList,
  MessageSquare,
  TrendingUp,
  BarChart3,
  ArrowRight,
} from "lucide-react"
import { PageHeader } from "@/components/app-shell"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Workflows" }

const workflows = [
  {
    title: "1. Configurar Perfil & CV",
    description: "Faça o upload do seu currículo em PDF/TXT e extraia seu perfil profissional automaticamente com IA.",
    actionText: "Ir para Configurações",
    href: "/settings",
    icon: UserCheck,
    badge: "Extração IA",
  },
  {
    title: "2. Buscar Vagas",
    description: "Pesquise em múltiplos portais simultaneamente (LinkedIn, Indeed-BR, Freehire, etc.) com filtro de localização.",
    actionText: "Buscar Vagas",
    href: "/jobs",
    icon: Search,
    badge: "Scraper Ativo",
  },
  {
    title: "3. Classificar Vagas por Fit",
    description: "Avalie a aderência de cada vaga encontrada ao seu perfil profissional e ordene por relevância (Score 0-100).",
    actionText: "Classificar Vagas",
    href: "/jobs",
    icon: Star,
    badge: "Bifrost CT109",
  },
  {
    title: "4. Preparar Candidatura",
    description: "Gere currículo adaptado em Markdown, carta de apresentação e auditoria ATS com segundo agente revisor.",
    actionText: "Ver Fill-Ups Recomendados",
    href: "/fill-ups",
    icon: FileCheck,
    badge: "Gerador Automatizado",
  },
  {
    title: "5. Registrar Resultados & Pipeline",
    description: "Acompanhe o status de cada candidatura enviada, registre entrevistas, ofertas ou rejeições.",
    actionText: "Ver Candidaturas",
    href: "/applications",
    icon: ClipboardList,
    badge: "Tracker Ativo",
  },
  {
    title: "6. Preparar Entrevistas",
    description: "Gere perguntas simuladas, respostas no formato STAR, pesquisa sobre a empresa e argumentos salariais.",
    actionText: "Preparar Entrevista",
    href: "/calendar",
    icon: MessageSquare,
    badge: "Simulador IA",
  },
  {
    title: "7. Analisar Lacunas & Upskill",
    description: "Identifique competências técnicas ausentes no seu perfil e receba recomendações de cursos e aprimoramento.",
    actionText: "Ver Análise em Lote",
    href: "/batch",
    icon: TrendingUp,
    badge: "Matriz de Competências",
  },
  {
    title: "8. Dashboard & Relatórios",
    description: "Visualize métricas consolidadas do seu pipeline de contratação, taxa de conversão e relatórios de progresso.",
    actionText: "Ver Estatísticas",
    href: "/statistics",
    icon: BarChart3,
    badge: "Relatório Consolidado",
  },
]

export default function WorkflowsPage() {
  return (
    <>
      <PageHeader
        title="Workflows Integrados"
        description="Execute todas as etapas da sua busca por empregos diretamente na interface visual. Todas as rotas estão integradas ao CT223 e ao servidor de inferência CT109."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {workflows.map((wf) => {
          const Icon = wf.icon
          return (
            <article
              key={wf.title}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-700"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-semibold text-white">{wf.title}</h2>
                  </div>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-emerald-300 border border-slate-700">
                    {wf.badge}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-400">{wf.description}</p>
              </div>

              <div className="mt-6 border-t border-slate-800/80 pt-4">
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link href={wf.href}>
                    <span>{wf.actionText}</span>
                    <ArrowRight className="h-4 w-4 text-emerald-400" />
                  </Link>
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
