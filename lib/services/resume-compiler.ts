import { CandidateProfile } from "@/lib/db/profile-schema"
import { ResumeDocument, ResumeDocumentSchema } from "@/lib/db/resume-schema"
import { extractJobKeywords } from "@/lib/services/tailoring-engine"

export interface TargetJobContext {
  id?: string
  title: string
  company: string
  description?: string
}

export function compileResumeDocument(
  profile: CandidateProfile,
  targetJob?: TargetJobContext
): ResumeDocument {
  const { identity, contact, skills, experiences, projects, education, certifications } = profile

  const jobKeywords = targetJob?.description
    ? extractJobKeywords(targetJob.description)
    : { technicalSkills: [], softSkills: [], toolsAndFrameworks: [], domainKeywords: [], allKeywords: [] }

  const title = targetJob
    ? `CV - ${targetJob.title} (${targetJob.company})`
    : `CV - ${identity.fullName || "Canônico"}`

  // Mapear experiências
  const compiledExperiences = (experiences || []).map((exp) => {
    return {
      id: exp.id || crypto.randomUUID(),
      company: exp.company,
      role: exp.role,
      location: exp.location || "",
      startDate: exp.startDate,
      endDate: exp.endDate || "Presente",
      highlights: [...(exp.highlights || []), ...(exp.achievements || [])],
      skillsUsed: exp.skillsUsed || [],
      visible: true,
    }
  })

  // Mapear projetos
  const compiledProjects = (projects || []).map((proj) => {
    return {
      id: proj.id || crypto.randomUUID(),
      name: proj.name,
      description: proj.description || "",
      role: proj.role || "",
      url: proj.url || "",
      highlights: proj.highlights || [],
      techStack: proj.techStack || [],
      visible: true,
    }
  })

  // Mapear educação
  const compiledEducation = (education || []).map((edu) => {
    return {
      id: edu.id || crypto.randomUUID(),
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
      startYear: edu.startYear,
      endYear: edu.endYear,
      thesis: edu.thesis,
      visible: true,
    }
  })

  // Mapear certificações
  const compiledCertifications = (certifications || []).map((cert) => {
    return {
      id: cert.id || crypto.randomUUID(),
      name: cert.name,
      issuer: cert.issuer,
      completedDate: cert.completedDate,
      hours: cert.hours,
      visible: true,
    }
  })

  // Destacar habilidades prioritárias com base em keywords se disponível
  const primarySkills = Array.from(
    new Set([...(skills.primary || []), ...jobKeywords.technicalSkills])
  )
  const secondarySkills = Array.from(new Set(skills.secondary || []))
  const toolsSkills = Array.from(
    new Set([...(skills.tools || []), ...jobKeywords.toolsAndFrameworks])
  )
  const domainSkills = Array.from(new Set(skills.domains || []))

  const doc: ResumeDocument = {
    id: crypto.randomUUID(),
    title,
    jobId: targetJob?.id,
    profileVersion: profile.meta?.version || 1,
    basics: {
      fullName: identity.fullName || "",
      email: contact.email || identity.email || "",
      phone: contact.phone || identity.phone || "",
      location: contact.location || identity.location || "",
      headline: identity.headline || "",
      summary: identity.summary || "",
      linkedinUrl: identity.linkedinUrl || contact.linkedin || "",
      githubUrl: identity.githubUrl || contact.github || "",
      websiteUrl: identity.websiteUrl || contact.portfolio || "",
    },
    sections: {
      experiences: compiledExperiences,
      projects: compiledProjects,
      education: compiledEducation,
      certifications: compiledCertifications,
      skills: {
        primary: primarySkills,
        secondary: secondarySkills,
        tools: toolsSkills,
        domains: domainSkills,
      },
    },
    meta: {
      template: "moderncv",
      language: "pt-BR",
      fontSize: "11pt",
      fontFamily: "sans",
      color: "blue",
    },
    updatedAt: new Date().toISOString(),
  }

  return ResumeDocumentSchema.parse(doc)
}
