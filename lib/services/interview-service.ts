import { getDb } from "@/lib/db"
import { CandidateProfile } from "@/lib/db/profile-schema"
import { extractJobKeywords } from "@/lib/services/tailoring-engine"

export interface StarBehavioralAnswer {
  question: string
  situation: string
  task: string
  action: string
  result: string
  sourceExperienceCompany?: string
}

export interface InterviewPrepGuide {
  jobTitle: string
  company: string
  technicalQuestions: Array<{ question: string; keyTalkingPoints: string[] }>
  starBehavioralAnswers: StarBehavioralAnswer[]
  questionsToAskInterviewer: string[]
  companyResearchTips: string[]
}

export interface InterviewItem {
  id: string
  userId: string
  jobId?: string
  company: string
  role: string
  interviewType: "screening" | "technical" | "cultural" | "system_design" | "final"
  scheduledAt: string
  locationOrLink?: string
  status: "scheduled" | "completed" | "canceled"
  notes?: string
  prepGuide?: InterviewPrepGuide
  createdAt: string
  updatedAt: string
}

export function generateInterviewPrepGuide(
  job: { title: string; company: string; description?: string },
  profile: CandidateProfile
): InterviewPrepGuide {
  const keywords = extractJobKeywords(job.description || "")
  const { experiences, identity, skills } = profile

  // 1. Perguntas Técnicas Prováveis
  const technicalQuestions: Array<{ question: string; keyTalkingPoints: string[] }> = []

  if (keywords.technicalSkills.length > 0) {
    keywords.technicalSkills.slice(0, 3).forEach((skill) => {
      const formattedSkill = skill.toUpperCase()
      technicalQuestions.push({
        question: `Como você aplica ${formattedSkill} para garantir alta performance e manutenibilidade em produção?`,
        keyTalkingPoints: [
          `Mencionar arquitetura limpa e testes com ${formattedSkill}`,
          `Relatar otimização de consultas/processamento recente`,
          `Explicar padrão de tratamento de erros e resiliência`,
        ],
      })
    })
  } else {
    technicalQuestions.push({
      question: `Como você estrutura a arquitetura e testes em novos projetos de software?`,
      keyTalkingPoints: [
        "Separação clara em camadas e testes automatizados",
        "Uso de boas práticas de CI/CD e revisão de código",
      ],
    })
  }

  // 2. Perguntas Comportamentais (Método STAR com Fatos Reais do Perfil)
  const starBehavioralAnswers: StarBehavioralAnswer[] = []

  if (experiences && experiences.length > 0) {
    const exp1 = experiences[0]
    starBehavioralAnswers.push({
      question: "Conte sobre um desafio técnico complexo que você enfrentou e como o resolveu.",
      situation: `Na ${exp1.company}, atuando como ${exp1.role}, o sistema precisava atender a altos requisitos de demanda.`,
      task: "A equipe precisava refatorar o gargalo e aumentar a eficiência operacional sem causar downtime.",
      action: exp1.highlights[0] || `Desenvolvi e liderei a otimização das APIs e microsserviços.`,
      result: exp1.highlights[1] || `Redução significativa no tempo de resposta e aumento de estabilidade.`,
      sourceExperienceCompany: exp1.company,
    })

    if (experiences.length > 1) {
      const exp2 = experiences[1]
      starBehavioralAnswers.push({
        question: "Descreva um momento em que precisou aprender uma nova tecnologia sob pressão de prazo.",
        situation: `Durante minha jornada na ${exp2.company} como ${exp2.role}.`,
        task: "Integrar uma nova stack técnica para cumprir um marco crítico de entrega.",
        action: `Apliquei metodologias ágeis e prototipagem rápida para dominar as ferramentas necessárias.`,
        result: exp2.highlights[0] || `Entrega dentro do prazo previsto com código limpo e testado.`,
        sourceExperienceCompany: exp2.company,
      })
    }
  } else {
    starBehavioralAnswers.push({
      question: "Como você lida com prazos apertados e priorização de tarefas?",
      situation: "Em projetos anteriores com entregas concorrentes.",
      task: "Garantir a entrega das funcionalidades de maior valor para o negócio no prazo.",
      action: "Priorização transparente com a liderança e alinhamento contínuo de expectativas.",
      result: "Projetos entregues com estabilidade e sem débitos técnicos críticos.",
    })
  }

  // 3. Perguntas Inteligentes para Fazer ao Entrevistador
  const questionsToAskInterviewer = [
    `Quais são os maiores desafios técnicos que a equipe da ${job.company} pretende resolver nos próximos 6 meses?`,
    "Como é a cultura de autonomia, testes automatizados e implantação contínua na engenharia?",
    "Quais são os critérios de sucesso e impacto esperado para este profissional no primeiro trimestre?",
  ]

  // 4. Dicas de Pesquisa da Empresa
  const companyResearchTips = [
    `Pesquisar recentes lançamentos de produtos e artigos de engenharia da ${job.company}.`,
    `Verificar o perfil dos líderes de tecnologia e recrutadores no LinkedIn.`,
    "Revisar seus projetos pessoais e do repositório relacionados aos requisitos da vaga.",
  ]

  return {
    jobTitle: job.title,
    company: job.company,
    technicalQuestions,
    starBehavioralAnswers,
    questionsToAskInterviewer,
    companyResearchTips,
  }
}

export function createInterview(
  userId: string,
  data: {
    jobId?: string
    company: string
    role: string
    interviewType?: InterviewItem["interviewType"]
    scheduledAt: string
    locationOrLink?: string
    notes?: string
    prepGuide?: InterviewPrepGuide
  }
): InterviewItem {
  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const item: InterviewItem = {
    id,
    userId,
    jobId: data.jobId,
    company: data.company,
    role: data.role,
    interviewType: data.interviewType || "technical",
    scheduledAt: data.scheduledAt,
    locationOrLink: data.locationOrLink || "",
    status: "scheduled",
    notes: data.notes || "",
    prepGuide: data.prepGuide,
    createdAt: now,
    updatedAt: now,
  }

  db.prepare(`
    INSERT INTO interviews (id, user_id, job_id, company, role, interview_type, scheduled_at, location_or_link, status, notes, prep_guide_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    item.id,
    item.userId,
    item.jobId || null,
    item.company,
    item.role,
    item.interviewType,
    item.scheduledAt,
    item.locationOrLink,
    item.status,
    item.notes,
    item.prepGuide ? JSON.stringify(item.prepGuide) : null
  )

  return item
}

export function listInterviews(userId: string): InterviewItem[] {
  const db = getDb()
  const rows = db
    .prepare(
      "SELECT id, user_id as userId, job_id as jobId, company, role, interview_type as interviewType, scheduled_at as scheduledAt, location_or_link as locationOrLink, status, notes, prep_guide_json as prepGuideJson, created_at as createdAt, updated_at as updatedAt FROM interviews WHERE user_id = ? ORDER BY scheduled_at ASC"
    )
    .all(userId) as any[]

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    jobId: r.jobId || undefined,
    company: r.company,
    role: r.role,
    interviewType: r.interviewType,
    scheduledAt: r.scheduledAt,
    locationOrLink: r.locationOrLink || "",
    status: r.status,
    notes: r.notes || "",
    prepGuide: r.prepGuideJson ? JSON.parse(r.prepGuideJson) : undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))
}

export function getInterview(id: string): InterviewItem | null {
  const db = getDb()
  const row = db
    .prepare(
      "SELECT id, user_id as userId, job_id as jobId, company, role, interview_type as interviewType, scheduled_at as scheduledAt, location_or_link as locationOrLink, status, notes, prep_guide_json as prepGuideJson, created_at as createdAt, updated_at as updatedAt FROM interviews WHERE id = ?"
    )
    .get(id) as any

  if (!row) return null

  return {
    id: row.id,
    userId: row.userId,
    jobId: row.jobId || undefined,
    company: row.company,
    role: row.role,
    interviewType: row.interviewType,
    scheduledAt: row.scheduledAt,
    locationOrLink: row.locationOrLink || "",
    status: row.status,
    notes: row.notes || "",
    prepGuide: row.prepGuideJson ? JSON.parse(row.prepGuideJson) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function updateInterview(
  id: string,
  updates: Partial<InterviewItem>
): InterviewItem | null {
  const db = getDb()
  const current = getInterview(id)
  if (!current) return null

  const updated: InterviewItem = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  db.prepare(`
    UPDATE interviews
    SET company = ?, role = ?, interview_type = ?, scheduled_at = ?, location_or_link = ?, status = ?, notes = ?, prep_guide_json = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    updated.company,
    updated.role,
    updated.interviewType,
    updated.scheduledAt,
    updated.locationOrLink || "",
    updated.status,
    updated.notes || "",
    updated.prepGuide ? JSON.stringify(updated.prepGuide) : null,
    id
  )

  return updated
}

export function deleteInterview(id: string): boolean {
  const db = getDb()
  const res = db.prepare("DELETE FROM interviews WHERE id = ?").run(id)
  return res.changes > 0
}
