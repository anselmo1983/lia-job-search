import { z } from "zod"

export const JsonPatchOperationSchema = z.object({
  op: z.enum(["add", "remove", "replace", "move", "copy", "test"]),
  path: z.string(),
  value: z.any().optional(),
  from: z.string().optional(),
})

export type JsonPatchOperation = z.infer<typeof JsonPatchOperationSchema>

export const ResumeBasicsSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().default(""),
  location: z.string().default(""),
  headline: z.string().default(""),
  summary: z.string().default(""),
  linkedinUrl: z.string().default(""),
  githubUrl: z.string().default(""),
  websiteUrl: z.string().default(""),
})

export const ResumeExperienceItemSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().default(""),
  startDate: z.string().min(1),
  endDate: z.string().default("Presente"),
  highlights: z.array(z.string()).default([]),
  skillsUsed: z.array(z.string()).default([]),
  visible: z.boolean().default(true),
})

export const ResumeProjectItemSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  name: z.string().min(1),
  description: z.string().default(""),
  role: z.string().default(""),
  url: z.string().default(""),
  highlights: z.array(z.string()).default([]),
  techStack: z.array(z.string()).default([]),
  visible: z.boolean().default(true),
})

export const ResumeEducationItemSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  startYear: z.string().min(1),
  endYear: z.string().min(1),
  thesis: z.string().optional(),
  visible: z.boolean().default(true),
})

export const ResumeCertificationItemSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  name: z.string().min(1),
  issuer: z.string().optional(),
  completedDate: z.string().min(1),
  hours: z.number().optional(),
  visible: z.boolean().default(true),
})

export const ResumeSkillsSectionSchema = z.object({
  primary: z.array(z.string()).default([]),
  secondary: z.array(z.string()).default([]),
  domains: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
})

export const ResumeSectionsSchema = z.object({
  experiences: z.array(ResumeExperienceItemSchema).default([]),
  projects: z.array(ResumeProjectItemSchema).default([]),
  education: z.array(ResumeEducationItemSchema).default([]),
  certifications: z.array(ResumeCertificationItemSchema).default([]),
  skills: ResumeSkillsSectionSchema.default({ primary: [], secondary: [], domains: [], tools: [] }),
})

export const ResumeMetaSchema = z.object({
  template: z.string().default("moderncv"),
  language: z.string().default("pt-BR"),
  fontSize: z.string().default("11pt"),
  fontFamily: z.string().default("sans"),
  color: z.string().default("blue"),
})

export const ResumeDocumentSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  title: z.string().min(1),
  jobId: z.string().optional(),
  profileVersion: z.number().default(1),
  basics: ResumeBasicsSchema,
  sections: ResumeSectionsSchema,
  meta: ResumeMetaSchema.default({
    template: "moderncv",
    language: "pt-BR",
    fontSize: "11pt",
    fontFamily: "sans",
    color: "blue",
  }),
  updatedAt: z.string().default(() => new Date().toISOString()),
})

export type ResumeDocument = z.infer<typeof ResumeDocumentSchema>

export const ResumeVersionSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  resumeId: z.string(),
  versionNumber: z.number().min(1),
  patch: z.array(JsonPatchOperationSchema).default([]),
  snapshot: ResumeDocumentSchema,
  author: z.string().default("user"), // 'user' | 'agent:tailoring' | 'agent:corrector'
  changeSummary: z.string().default("Initial compile"),
  createdAt: z.string().default(() => new Date().toISOString()),
})

export type ResumeVersion = z.infer<typeof ResumeVersionSchema>
