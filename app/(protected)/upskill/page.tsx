import { PageHeader } from "@/components/app-shell"
import { UpskillManager } from "@/components/upskill/upskill-manager"

export const dynamic = "force-dynamic"
export const metadata = { title: "Upskilling & Skill Gap Analysis" }

export default function UpskillPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Upskilling & Análise de Lacunas"
        description="Identificação inteligente das habilidades em alta demanda nas suas vagas salvas e recomendação de plano de estudos."
      />

      {/* Componente Interativo de Upskilling & Lacunas */}
      <UpskillManager />
    </div>
  )
}
