import { CandidateProfile } from "@/lib/db/profile-schema"
import { CoverLetterDocument, CoverLetterDocumentSchema } from "@/lib/db/cover-letter-schema"

export function compileCoverLetterDocument(
  profile: CandidateProfile,
  job: { id?: string; title: string; company: string; description?: string }
): CoverLetterDocument {
  const { identity, contact, experiences, skills } = profile

  const candidateName = identity.fullName || "Candidato"
  const topSkills = (skills.primary || []).slice(0, 3).join(", ")
  const topExperience = experiences && experiences.length > 0 ? experiences[0] : null

  const openingParagraph = `Estou escrevendo para demonstrar meu forte interesse e apresentar minha candidatura para a vaga de ${job.title} na ${job.company}. Com uma sólida trajetória como ${identity.headline || "profissional da área de tecnologia"} e experiência prática na construção de soluções escaláveis, estou entusiasmado com a oportunidade de contribuir diretamente com os objetivos da equipe.`

  const expHighlight = topExperience
    ? `Em minha atuação mais recente como ${topExperience.role} na ${topExperience.company}, fui responsável por marcos importantes como: ${topExperience.highlights.slice(0, 2).join("; ")}.`
    : `Tenho experiência comprovada em desenvolvimento de software com foco em qualidade e entregas contínuas.`

  const skillHighlight = topSkills
    ? `Minhas principais competências técnicas englobam ${topSkills}, permitindo uma adaptação ágil às demandas e arquiteturas tecnológicas da ${job.company}.`
    : `Busco sempre aplicar as melhores práticas de engenharia de software e colaboração em equipe.`

  const bodyParagraphs = [expHighlight, skillHighlight]

  const closingParagraph = `Acredito que meu perfil técnico alinhado ao foco em resultados trará valor imediato aos projetos da ${job.company}. Agradeço a atenção e coloco-me à disposição para uma entrevista onde poderei detalhar minhas experiências.`

  const doc: CoverLetterDocument = {
    id: crypto.randomUUID(),
    jobId: job.id,
    title: `Carta - ${job.title} (${job.company})`,
    basics: {
      fullName: candidateName,
      email: contact.email || identity.email || "",
      phone: contact.phone || identity.phone || "",
      location: contact.location || identity.location || "",
      linkedinUrl: contact.linkedin || identity.linkedinUrl || "",
    },
    recipientCompany: job.company,
    targetRole: job.title,
    salutation: `Prezada equipe de recrutamento da ${job.company},`,
    openingParagraph,
    bodyParagraphs,
    closingParagraph,
    signOff: "Atenciosamente,",
    meta: {
      template: "moderncv",
      language: "pt-BR",
      color: "blue",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return CoverLetterDocumentSchema.parse(doc)
}
