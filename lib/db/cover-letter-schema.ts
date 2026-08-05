import { z } from "zod"

export const CoverLetterBasicsSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().default(""),
  location: z.string().default(""),
  linkedinUrl: z.string().default(""),
})

export const CoverLetterDocumentSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  jobId: z.string().optional(),
  title: z.string().min(1),
  basics: CoverLetterBasicsSchema,
  recipientCompany: z.string().min(1),
  targetRole: z.string().min(1),
  salutation: z.string().default("Prezada equipe de recrutamento,"),
  openingParagraph: z.string().min(1),
  bodyParagraphs: z.array(z.string()).min(1),
  closingParagraph: z.string().min(1),
  signOff: z.string().default("Atenciosamente,"),
  meta: z
    .object({
      template: z.string().default("moderncv"),
      language: z.string().default("pt-BR"),
      color: z.string().default("blue"),
    })
    .default({ template: "moderncv", language: "pt-BR", color: "blue" }),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
})

export type CoverLetterDocument = z.infer<typeof CoverLetterDocumentSchema>
