import { z } from "zod"

export const LanguageSchema = z.object({
  language: z.string().min(1),
  level: z.string().min(1),
})

export const SkillEvidenceSchema = z.object({
  skill: z.string().min(1),
  proficiency: z.string().optional(),
  evidence: z.array(z.string()).default([]),
  sourceIds: z.array(z.string()).default([]),
  verified: z.boolean().default(true),
  category: z.string().optional(),
})

export const SkillsContainerSchema = z.object({
  primary: z.array(z.string()).default([]),
  secondary: z.array(z.string()).default([]),
  domains: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  evidences: z.array(SkillEvidenceSchema).default([]),
})

export const ExperienceSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().default(""),
  startDate: z.string().min(1),
  endDate: z.string().default("Presente"),
  highlights: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  skillsUsed: z.array(z.string()).default([]),
  sourceId: z.string().optional(),
})

export const ProjectSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  name: z.string().min(1),
  description: z.string().default(""),
  role: z.string().default(""),
  url: z.string().default(""),
  highlights: z.array(z.string()).default([]),
  techStack: z.array(z.string()).default([]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const EducationSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  startYear: z.string().min(1),
  endYear: z.string().min(1),
  thesis: z.string().optional(),
  achievements: z.array(z.string()).default([]),
})

export const CertificationSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  name: z.string().min(1),
  issuer: z.string().optional(),
  credentialId: z.string().optional(),
  hours: z.number().optional(),
  completedDate: z.string().min(1),
  expiryDate: z.string().optional(),
})

export const JobPreferencesSchema = z.object({
  targetRoles: z.array(z.string()).default([]),
  targetSectors: z.array(z.string()).default([]),
  desiredWorkMode: z.string().default("Remoto"),
  commuteConstraints: z.string().default(""),
  salaryExpectation: z.string().default(""),
  energizingActivities: z.array(z.string()).default([]),
  drainingActivities: z.array(z.string()).default([]),
  transferableSkills: z.array(z.string()).default([]),
})

export const CandidateConstraintsSchema = z.object({
  commute: z.string().default(""),
  dealbreakers: z.array(z.string()).default([]),
  noticePeriod: z.string().default("Imediato"),
  workAuthorization: z.string().default(""),
  geoRestrictions: z.array(z.string()).default([]),
})

export const ApplicationFactSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  category: z.string().default("General"),
  factKey: z.string().min(1),
  factValue: z.string().min(1),
  evidence: z.string().default(""),
  verified: z.boolean().default(true),
})

export const ApplicationAnswerSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  questionHash: z.string().default(""),
  questionText: z.string().min(1),
  answerText: z.string().min(1),
  category: z.string().default("screener"),
  lastUsedAt: z.string().default(() => new Date().toISOString()),
})

export const SourceDocumentSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  filename: z.string().min(1),
  docType: z.enum(["cv", "linkedin", "cover_letter", "portfolio", "other"]).default("other"),
  contentText: z.string().default(""),
  uploadedAt: z.string().default(() => new Date().toISOString()),
})

export const CandidateIdentitySchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().default(""),
  location: z.string().default(""),
  headline: z.string().default(""),
  summary: z.string().default(""),
  linkedinUrl: z.string().default(""),
  githubUrl: z.string().default(""),
  websiteUrl: z.string().default(""),
  languages: z.array(LanguageSchema).default([]),
  employmentStatus: z.string().default("Disponível"),
})

export const ContactInformationSchema = z.object({
  email: z.string().email(),
  phone: z.string().default(""),
  location: z.string().default(""),
  linkedin: z.string().default(""),
  github: z.string().default(""),
  portfolio: z.string().default(""),
  preferredContactMethod: z.string().default("email"),
})

export const CandidateProfileMetaSchema = z.object({
  version: z.number().default(1),
  updatedAt: z.string().default(() => new Date().toISOString()),
  source: z.string().default("canonical"),
}).default({})

const SkillsPreprocessor = z.preprocess((val) => {
  if (Array.isArray(val)) {
    const evidences = val.map((item) => {
      if (typeof item === "string") {
        return { skill: item, evidence: [], sourceIds: [], verified: true }
      }
      return item
    })
    const primary = evidences.map((e) => e.skill)
    return { primary, secondary: [], domains: [], tools: [], evidences }
  }
  if (typeof val === "object" && val !== null) {
    const rawObj = val as any
    const primary = Array.isArray(rawObj.primary) ? rawObj.primary : []
    const secondary = Array.isArray(rawObj.secondary) ? rawObj.secondary : []
    const domains = Array.isArray(rawObj.domains) ? rawObj.domains : []
    const tools = Array.isArray(rawObj.tools) ? rawObj.tools : []
    let evidences = Array.isArray(rawObj.evidences) ? rawObj.evidences : []

    if (evidences.length === 0) {
      const allStrings = [...primary, ...secondary, ...domains, ...tools]
      evidences = allStrings.map((skill: string) => ({
        skill,
        evidence: [],
        sourceIds: [],
        verified: true,
        category: primary.includes(skill)
          ? "primary"
          : secondary.includes(skill)
          ? "secondary"
          : domains.includes(skill)
          ? "domain"
          : "tool",
      }))
    }

    return { primary, secondary, domains, tools, evidences }
  }
  return { primary: [], secondary: [], domains: [], tools: [], evidences: [] }
}, SkillsContainerSchema)

export const SkillsSchema = SkillsPreprocessor

const CandidateProfilePreprocessor = z.preprocess((val: any) => {
  if (typeof val !== "object" || val === null) return val

  const identity = val.identity || {}
  const targetPref = val.targetPreferences || {}
  const pref = val.preferences || {}
  const constr = val.constraints || {}

  const mergedPreferences = {
    targetRoles: pref.targetRoles || targetPref.targetRoles || [],
    targetSectors: pref.targetSectors || targetPref.targetSectors || [],
    desiredWorkMode: pref.desiredWorkMode || "Remoto",
    commuteConstraints: pref.commuteConstraints || targetPref.commuteConstraints || "",
    salaryExpectation: pref.salaryExpectation || "",
    energizingActivities: pref.energizingActivities || targetPref.energizingActivities || [],
    drainingActivities: pref.drainingActivities || targetPref.drainingActivities || [],
    transferableSkills: pref.transferableSkills || targetPref.transferableSkills || [],
  }

  const mergedConstraints = {
    commute: constr.commute || targetPref.commuteConstraints || "",
    dealbreakers: constr.dealbreakers || targetPref.dealbreakers || [],
    noticePeriod: constr.noticePeriod || "Imediato",
    workAuthorization: constr.workAuthorization || "",
    geoRestrictions: constr.geoRestrictions || [],
  }

  const contact = val.contact || {
    email: identity.email || "",
    phone: identity.phone || "",
    location: identity.location || "",
    linkedin: identity.linkedinUrl || "",
    github: identity.githubUrl || "",
    portfolio: identity.websiteUrl || "",
    preferredContactMethod: "email",
  }

  const meta = val.meta || {
    version: val.version || 1,
    updatedAt: val.updatedAt || new Date().toISOString(),
    source: "canonical",
  }

  return {
    meta,
    version: val.version || meta.version || 1,
    updatedAt: val.updatedAt || meta.updatedAt || new Date().toISOString(),
    headline: val.headline || identity.headline || "",
    summary: val.summary || identity.summary || "",
    identity: {
      fullName: identity.fullName || "",
      email: identity.email || "",
      phone: identity.phone || "",
      location: identity.location || "",
      headline: val.headline || identity.headline || "",
      summary: val.summary || identity.summary || "",
      linkedinUrl: identity.linkedinUrl || "",
      githubUrl: identity.githubUrl || "",
      websiteUrl: identity.websiteUrl || "",
      languages: identity.languages || [],
      employmentStatus: identity.employmentStatus || "Disponível",
    },
    contact,
    skills: SkillsPreprocessor.parse(val.skills || {}),
    experiences: val.experiences || [],
    projects: val.projects || [],
    education: val.education || [],
    certifications: val.certifications || [],
    languages: val.languages || identity.languages || [],
    preferences: mergedPreferences,
    targetPreferences: {
      targetRoles: mergedPreferences.targetRoles,
      targetSectors: mergedPreferences.targetSectors,
      commuteConstraints: mergedPreferences.commuteConstraints,
      dealbreakers: mergedConstraints.dealbreakers,
      energizingActivities: mergedPreferences.energizingActivities,
      drainingActivities: mergedPreferences.drainingActivities,
      transferableSkills: mergedPreferences.transferableSkills,
    },
    constraints: mergedConstraints,
    applicationFacts: val.applicationFacts || [],
    answerVault: val.answerVault || [],
    sourceDocuments: val.sourceDocuments || [],
  }
}, z.object({
  meta: CandidateProfileMetaSchema,
  version: z.number().default(1),
  updatedAt: z.string(),
  headline: z.string().default(""),
  summary: z.string().default(""),
  identity: CandidateIdentitySchema,
  contact: ContactInformationSchema,
  skills: SkillsContainerSchema,
  experiences: z.array(ExperienceSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  education: z.array(EducationSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  languages: z.array(LanguageSchema).default([]),
  preferences: JobPreferencesSchema,
  targetPreferences: z.object({
    targetRoles: z.array(z.string()).default([]),
    targetSectors: z.array(z.string()).default([]),
    commuteConstraints: z.string().default(""),
    dealbreakers: z.array(z.string()).default([]),
    energizingActivities: z.array(z.string()).default([]),
    drainingActivities: z.array(z.string()).default([]),
    transferableSkills: z.array(z.string()).default([]),
  }).default({}),
  constraints: CandidateConstraintsSchema,
  applicationFacts: z.array(ApplicationFactSchema).default([]),
  answerVault: z.array(ApplicationAnswerSchema).default([]),
  sourceDocuments: z.array(SourceDocumentSchema).default([]),
}))

export const CandidateProfileSchema = CandidateProfilePreprocessor

export type CandidateProfileInput = z.input<typeof CandidateProfileSchema>
export type CandidateProfile = z.infer<typeof CandidateProfileSchema>

export function getProfileSkillsList(profile: CandidateProfile): string[] {
  const primary = profile.skills.primary || []
  const secondary = profile.skills.secondary || []
  const tools = profile.skills.tools || []
  const domains = profile.skills.domains || []
  const evidences = (profile.skills.evidences || []).map((e) => e.skill)

  return Array.from(new Set([...primary, ...secondary, ...tools, ...domains, ...evidences])).filter(Boolean)
}

export function getSkillEvidences(profile: CandidateProfile): z.infer<typeof SkillEvidenceSchema>[] {
  return profile.skills.evidences || []
}

