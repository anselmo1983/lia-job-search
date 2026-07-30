import { PageHeader } from "@/components/app-shell"

export const metadata = { title: "Workflows" }

const workflows = [
  ["Configurar perfil", "/setup", "Importa seus documentos ou conduz uma entrevista para preencher o perfil."],
  ["Buscar vagas", "/scrape", "Pesquisa os portais instalados e elimina resultados duplicados."],
  ["Classificar vagas", "/rank", "Avalia as vagas encontradas e cria uma shortlist por aderência."],
  ["Preparar candidatura", "/apply <URL>", "Avalia a vaga e produz CV e carta personalizados com revisão."],
  ["Registrar resultado", "/outcome", "Atualiza o pipeline, arquiva materiais e registra entrevistas ou rejeições."],
  ["Preparar entrevista", "/interview", "Cria preparação específica usando os materiais realmente enviados."],
  ["Analisar lacunas", "/upskill", "Prioriza competências ausentes nas vagas acompanhadas."],
  ["Gerar relatório", "/html-report", "Gera um dashboard HTML portátil a partir do tracker."],
]

export default function WorkflowsPage() {
  return <><PageHeader title="Workflows" description="Atalhos documentados para operar o projeto pelo seu agente de código. A UI não executa comandos do sistema por motivos de segurança." /><div className="grid gap-4 md:grid-cols-2">{workflows.map(([title, command, description], index) => <article key={command} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-start gap-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-sm font-bold text-emerald-300">{index + 1}</span><div><h2 className="font-semibold">{title}</h2><code className="my-2 block text-sm text-emerald-300">{command}</code><p className="text-sm leading-6 text-slate-400">{description}</p></div></div></article>)}</div></>
}
