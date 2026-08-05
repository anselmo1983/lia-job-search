import { z } from "zod"

export const LanguageSchema = z.object({
  language: z.string().min(1),
  level: z.string().min(1),
})

export const ExperienceSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().default(""),
  startDate: z.string().min(1),
  endDate: z.string().default("Presente"),
  highlights: z.array(z.string()).default([]),
})

export const EducationSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  startYear: z.string().min(1),
  endYear: z.string().min(1),
  thesis: z.string().optional(),
})

export const CertificationSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  name: z.string().min(1),
  hours: z.number().optional(),
  completedDate: z.string().min(1),
})

export const CandidateProfileSchema = z.object({
  identity: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().default(""),
    location: z.string().default(""),
    headline: z.string().default(""),
    summary: z.string().default(""),
    linkedinUrl: z.string().default(""),
    githubUrl: z.string().default(""),
    languages: z.array(LanguageSchema).default([]),
    employmentStatus: z.string().default("Disponível"),
  }),
  targetPreferences: z.object({
    targetRoles: z.array(z.string()).default([]),
    targetSectors: z.array(z.string()).default([]),
    commuteConstraints: z.string().default(""),
    dealbreakers: z.array(z.string()).default([]),
  }).default({}),
  skills: z.object({
    primary: z.array(z.string()).default([]),
    secondary: z.array(z.string()).default([]),
    domains: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
  }).default({}),
  experiences: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
})

export type CandidateProfile = z.infer<typeof CandidateProfileSchema>
