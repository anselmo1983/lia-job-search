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

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

export function findBestVaultAnswer(questionText: string, profile: CandidateProfile): string | null {
  if (!questionText) return null
  const qClean = normalizeText(questionText)
  if (!qClean) return null

  // 1. Procura na Answer Vault por correspondência exata ou de palavras-chave
  const vault = profile.answerVault || []
  for (const item of vault) {
    if (!item.questionText) continue
    const itemClean = normalizeText(item.questionText)
    if (itemClean === qClean || qClean.includes(itemClean) || itemClean.includes(qClean)) {
      return item.answerText
    }
  }

  // 2. Procura em ApplicationFacts por chave de fato
  const facts = profile.applicationFacts || []
  for (const fact of facts) {
    if (!fact.factKey) continue
    const keyClean = normalizeText(fact.factKey)
    if (qClean.includes(keyClean) || keyClean.includes(qClean)) {
      return fact.factValue
    }
    const qStems = qClean.split(/\s+/).filter((w) => w.length >= 4)
    const keyStems = keyClean.split(/\s+/).filter((w) => w.length >= 4)
    const hasOverlap = qStems.some((qs) => keyStems.some((ks) => qs.slice(0, 4) === ks.slice(0, 4)))
    if (hasOverlap) {
      return fact.factValue
    }
  }

  // 3. Checa restrições e preferências conhecidas
  const constraints = profile.constraints || {}
  const preferences = profile.preferences || {}

  if ((qClean.includes("salar") || qClean.includes("pretens") || qClean.includes("salary")) && preferences.salaryExpectation) {
    return preferences.salaryExpectation
  }

  if ((qClean.includes("aviso") || qClean.includes("notice") || qClean.includes("disponibil")) && constraints.noticePeriod) {
    return constraints.noticePeriod
  }

  if ((qClean.includes("visto") || qClean.includes("visa") || qClean.includes("autoriz") || qClean.includes("sponsorship")) && constraints.workAuthorization) {
    return constraints.workAuthorization
  }

  return null
}

export function autoFillFormSchema(fields: DetectedField[], profile: CandidateProfile): FilledFormField[] {
  const { identity, contact } = profile

  return fields.map((field) => {
    const key = (field.name + " " + field.label).toLowerCase()

    // 1. Tenta resposta do vault ou repositório de fatos
    let suggestedValue = findBestVaultAnswer(field.label || field.name, profile) || ""

    // 2. Se não encontrar no vault, usa mapeamento padrão de identidade/contato
    if (!suggestedValue) {
      if (key.includes("name") || key.includes("nome")) {
        suggestedValue = identity.fullName
      } else if (key.includes("email") || key.includes("e-mail")) {
        suggestedValue = contact.email || identity.email
      } else if (key.includes("phone") || key.includes("telef") || key.includes("celular")) {
        suggestedValue = contact.phone || identity.phone || ""
      } else if (key.includes("linkedin")) {
        suggestedValue = contact.linkedin || identity.linkedinUrl || ""
      } else if (key.includes("github")) {
        suggestedValue = contact.github || identity.githubUrl || ""
      } else if (key.includes("portfolio") || key.includes("site") || key.includes("website")) {
        suggestedValue = contact.portfolio || identity.websiteUrl || ""
      } else if (key.includes("city") || key.includes("cidade") || key.includes("location") || key.includes("local")) {
        suggestedValue = contact.location || identity.location || ""
      } else if (key.includes("summary") || key.includes("sobre") || key.includes("bio") || key.includes("presentation")) {
        suggestedValue = identity.summary || `${identity.fullName} - ${identity.headline}`
      } else {
        suggestedValue = identity.headline || "Profissional de TI"
      }
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

