import { CandidateProfile } from "@/lib/db/profile-schema"

export interface DetectedField {
  id: string
  name: string
  label: string
  type: "text" | "email" | "tel" | "url" | "textarea" | "select" | "file"
  maxLength?: number
  required: boolean
}

export interface FilledFormField {
  fieldId: string
  fieldName: string
  label: string
  suggestedValue: string
  characterCount: number
  isOverLimit: boolean
}

export function detectFormFields(htmlContent: string): DetectedField[] {
  const fields: DetectedField[] = []
  const inputRegex = /<input\s+([^>]+)>/gi
  const textareaRegex = /<textarea\s+([^>]+)>/gi

  let match: RegExpExecArray | null

  while ((match = inputRegex.exec(htmlContent)) !== null) {
    const attrs = match[1]
    const nameMatch = /name=["']([^"']+)["']/i.exec(attrs)
    const typeMatch = /type=["']([^"']+)["']/i.exec(attrs)
    const labelMatch = /placeholder=["']([^"']+)["']/i.exec(attrs) || /aria-label=["']([^"']+)["']/i.exec(attrs)
    const required = /required/i.test(attrs)

    if (nameMatch) {
      const name = nameMatch[1]
      const rawType = (typeMatch ? typeMatch[1] : "text").toLowerCase()
      let type: DetectedField["type"] = "text"
      if (rawType === "email") type = "email"
      else if (rawType === "tel") type = "tel"
      else if (rawType === "url") type = "url"
      else if (rawType === "file") type = "file"

      fields.push({
        id: `field_${name}`,
        name,
        label: labelMatch ? labelMatch[1] : name,
        type,
        required,
      })
    }
  }

  while ((match = textareaRegex.exec(htmlContent)) !== null) {
    const attrs = match[1]
    const nameMatch = /name=["']([^"']+)["']/i.exec(attrs)
    const labelMatch = /placeholder=["']([^"']+)["']/i.exec(attrs) || /aria-label=["']([^"']+)["']/i.exec(attrs)
    const maxMatch = /maxlength=["'](\d+)["']/i.exec(attrs)
    const required = /required/i.test(attrs)

    if (nameMatch) {
      const name = nameMatch[1]
      fields.push({
        id: `field_${name}`,
        name,
        label: labelMatch ? labelMatch[1] : name,
        type: "textarea",
        maxLength: maxMatch ? parseInt(maxMatch[1], 10) : undefined,
        required,
      })
    }
  }

  return fields
}

export function autoFillFormSchema(fields: DetectedField[], profile: CandidateProfile): FilledFormField[] {
  const { identity } = profile

  return fields.map((field) => {
    const key = (field.name + " " + field.label).toLowerCase()
    let suggestedValue = ""

    if (key.includes("name") || key.includes("nome")) {
      suggestedValue = identity.fullName
    } else if (key.includes("email") || key.includes("e-mail")) {
      suggestedValue = identity.email
    } else if (key.includes("phone") || key.includes("telef") || key.includes("celular")) {
      suggestedValue = identity.phone || ""
    } else if (key.includes("linkedin")) {
      suggestedValue = identity.linkedinUrl || ""
    } else if (key.includes("github")) {
      suggestedValue = identity.githubUrl || ""
    } else if (key.includes("city") || key.includes("cidade") || key.includes("location") || key.includes("local")) {
      suggestedValue = identity.location || ""
    } else if (key.includes("summary") || key.includes("sobre") || key.includes("bio") || key.includes("presentation")) {
      suggestedValue = identity.summary || `${identity.fullName} - ${identity.headline}`
    } else {
      suggestedValue = identity.headline || "Profissional de TI"
    }

    if (field.maxLength && suggestedValue.length > field.maxLength) {
      suggestedValue = suggestedValue.slice(0, field.maxLength)
    }

    return {
      fieldId: field.id,
      fieldName: field.name,
      label: field.label,
      suggestedValue,
      characterCount: suggestedValue.length,
      isOverLimit: field.maxLength ? suggestedValue.length > field.maxLength : false,
    }
  })
}
