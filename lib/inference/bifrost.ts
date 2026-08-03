import "server-only"

/**
 * lib/inference/bifrost.ts — Cliente server-side do Bifrost (CT109)
 *
 * Autoridade de inferência da plataforma. TODAS as chamadas de IA passam por
 * aqui, mantendo a arquitetura: UI → CT223 → lib/inference/bifrost.ts → CT109.
 *
 * Provider/model routing pertence ao Bifrost — nenhuma rota operacional pode
 * chamar OpenAI/Anthropic/Moonshot/DeepSeek diretamente.
 *
 * CONTRATO CANÔNICO DE ENV (única fonte de verdade, sem aliases):
 *   BIFROST_BASE_URL         ex: https://bifrost.ct109.example.com
 *   BIFROST_VIRTUAL_KEY      VK de acesso ao CT109 (server-side only, nunca enviada ao navegador)
 *   BIFROST_MODEL_DEFAULT    modelo padrão (extração de perfil, avaliação)
 *   BIFROST_MODEL_REVIEW     modelo de revisão (segunda passada)
 *   LIA_DATA_DIR             diretório de dados (container: /app/data; host: /opt/lia-job-search/data;
 *                            bind: -v /opt/lia-job-search/data:/app/data; nunca o caminho do host no container)
 *   APP_COMMIT               commit/tag do build (informativo)
 *
 * Deployment canônico do CT223: /opt/lia-job-search/runtime.env
 *   - modo 0600, owner root:root
 *   - .env.example é APENAS template de desenvolvimento
 *
 * Contrato esperado do CT109 (compatível com OpenAI):
 *   GET  {base}/health                → 200 se operacional
 *   GET  {base}/v1/models             → 200 se operacional
 *   POST {base}/v1/chat/completions   → { choices: [{ message: { content } }] }
 *
 * Este módulo NÃO deve ser importado de componentes client ("use client").
 */

const AUTHORITY = "CT109 Bifrost"
const CREDENTIAL_MODE = "server-side"
const HEALTH_TIMEOUT_MS = 5_000
const CHAT_TIMEOUT_MS = 120_000

export interface BifrostStatus {
  connected: boolean
  authority: string
  credentialMode: string
  defaultModel: string
  reviewModel: string
  message?: string
}

export interface BifrostMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface CompleteOptions {
  /** Modelo a usar; omite para usar o default do servidor. */
  model?: string
  /** Prompt de sistema. */
  system?: string
  /** Mensagens adicionais (role user/assistant). */
  messages?: BifrostMessage[]
  maxTokens?: number
  /** Força resposta em JSON válido. */
  json?: boolean
}

export type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type BifrostChatRequest = {
  model?: string
  messages: ChatMessage[]
  temperature?: number
  response_format?: {
    type: "json_object" | "text"
  }
}

export type BifrostChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
}

export function isConfigured(): boolean {
  return Boolean(process.env.BIFROST_BASE_URL && process.env.BIFROST_VIRTUAL_KEY)
}

export function bifrostConfigured(): boolean {
  return isConfigured()
}

export function getDefaultModel(): string | undefined {
  // Único valor válido: BIFROST_MODEL_DEFAULT. Nunca inventar modelo.
  return process.env.BIFROST_MODEL_DEFAULT
}

export function getReviewModel(): string | undefined {
  // Único valor válido: BIFROST_MODEL_REVIEW. Nunca inventar modelo.
  return process.env.BIFROST_MODEL_REVIEW
}

function baseUrl(): string {
  return (process.env.BIFROST_BASE_URL || "").replace(/\/+$/, "")
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  if (process.env.BIFROST_VIRTUAL_KEY) {
    headers["Authorization"] = `Bearer ${process.env.BIFROST_VIRTUAL_KEY}`
  }
  return headers
}

/** Primitiva única de requisição HTTP do Bifrost */
async function requestBifrost(
  endpoint: string,
  method: "GET" | "POST",
  body?: any,
  timeoutMs: number = CHAT_TIMEOUT_MS
): Promise<any> {
  if (!isConfigured()) {
    throw new Error("Inferência indisponível: Bifrost (CT109) não configurado no servidor (BIFROST_BASE_URL / BIFROST_VIRTUAL_KEY).")
  }

  const headers: Record<string, string> = {
    ...getHeaders(),
    ...(method === "POST" ? { "Content-Type": "application/json" } : {})
  }

  const url = `${baseUrl()}${endpoint}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`Bifrost (CT109) retornou ${res.status}: ${errText.slice(0, 300)}`)
    }

    const text = await res.text()
    if (!text.trim()) {
      return null
    }

    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  } finally {
    clearTimeout(timer)
  }
}

/** Verifica conectividade com o CT109 e expõe apenas informações não secretas. */
export async function getStatus(): Promise<BifrostStatus> {
  const base = {
    authority: AUTHORITY,
    credentialMode: CREDENTIAL_MODE,
    defaultModel: getDefaultModel() || "Not configured",
    reviewModel: getReviewModel() || "Not configured",
  }

  if (!isConfigured()) {
    return {
      ...base,
      connected: false,
      message: "Bifrost não configurado no servidor (BIFROST_BASE_URL / BIFROST_VIRTUAL_KEY)",
    }
  }

  try {
    await requestBifrost("/health", "GET", undefined, HEALTH_TIMEOUT_MS)
    return { ...base, connected: true }
  } catch {
    // tenta endpoint v1/models
    try {
      await requestBifrost("/v1/models", "GET", undefined, HEALTH_TIMEOUT_MS)
      return { ...base, connected: true }
    } catch {
      // sem conectividade
    }
  }

  return { ...base, connected: false, message: "Não foi possível conectar ao Bifrost (CT109)" }
}

async function chatCompletions(opts: CompleteOptions): Promise<string> {
  let messages: BifrostMessage[] = [
    ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
    ...(opts.messages || []),
  ]

  if (opts.json) {
    const jsonNote = "Responda APENAS com JSON válido, sem texto extra e sem markdown."
    const sysIdx = messages.findIndex((m) => m.role === "system")
    if (sysIdx >= 0) {
      messages[sysIdx] = { ...messages[sysIdx], content: `${messages[sysIdx].content}\n\n${jsonNote}` }
    } else {
      messages = [{ role: "system", content: jsonNote }, ...messages]
    }
  }

  const payload = {
    model: opts.model || getDefaultModel(),
    messages,
    max_tokens: opts.maxTokens ?? 2000,
    ...(opts.json ? { response_format: { type: "json_object" } } : {}),
  }

  const data = await requestBifrost("/v1/chat/completions", "POST", payload, CHAT_TIMEOUT_MS)
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Bifrost (CT109) retornou uma resposta vazia.")
  }
  return content
}

/** Compleção de texto livre (CV, carta, etc.). */
export async function completeText(opts: CompleteOptions): Promise<string> {
  return chatCompletions({ ...opts, json: false })
}

/** Compleção que valida e retorna JSON. */
export async function completeJson(opts: CompleteOptions): Promise<unknown> {
  const raw = await chatCompletions({ ...opts, json: true })
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error("Bifrost (CT109) não retornou JSON válido.")
  try {
    return JSON.parse(match[0])
  } catch {
    throw new Error("Bifrost (CT109) não retornou JSON válido.")
  }
}

/** Compatibilidade para chamadas estruturadas chat */
export async function bifrostChat(
  request: BifrostChatRequest,
): Promise<BifrostChatResponse> {
  const model =
    request.model ||
    process.env.BIFROST_MODEL_DEFAULT?.trim()

  if (!model) {
    throw new Error("No Bifrost application model alias configured")
  }

  const payload = {
    ...request,
    model,
  }

  const response = await requestBifrost("/v1/chat/completions", "POST", payload, CHAT_TIMEOUT_MS)
  return response as BifrostChatResponse
}
