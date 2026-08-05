import "server-only"

/**
 * lib/inference/bifrost.ts — Cliente server-side do Bifrost (CT109)
 *
 * Autoridade de inferência da plataforma. TODAS as chamadas de IA passam por
 * aqui, mantendo a arquitetura: UI → CT223 → lib/inference/bifrost.ts → CT109.
 */

const AUTHORITY = "CT109 Bifrost"
const CREDENTIAL_MODE = "server-side"
const HEALTH_TIMEOUT_MS = 5_000
const CHAT_TIMEOUT_MS = 120_000
const APPLICATION_NAME = "lia-job-search"

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

export type BifrostWorkloadOrigin = "app" | "user"

export interface BifrostMetadata {
  application?: string
  workload: string
  origin: BifrostWorkloadOrigin
  job_id?: string
  [key: string]: string | number | boolean | undefined
}

export interface CompleteOptions {
  model?: string
  system?: string
  messages?: BifrostMessage[]
  maxTokens?: number
  json?: boolean
  metadata?: BifrostMetadata
}

export type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type BifrostChatRequest = {
  model?: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  response_format?: {
    type: "json_object" | "text"
  }
  metadata?: BifrostMetadata
}

export type BifrostChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
}

export class BifrostHttpError extends Error {
  readonly status: number
  readonly responseBody: string

  constructor(status: number, responseBody: string) {
    super(`Bifrost (CT109) retornou ${status}: ${responseBody.slice(0, 300)}`)
    this.name = "BifrostHttpError"
    this.status = status
    this.responseBody = responseBody
  }
}

export function isBifrostHttpError(error: unknown): error is BifrostHttpError {
  return error instanceof BifrostHttpError
}

export function isConfigured(): boolean {
  return Boolean(process.env.BIFROST_BASE_URL && process.env.BIFROST_VIRTUAL_KEY)
}

export function bifrostConfigured(): boolean {
  return isConfigured()
}

export function getDefaultModel(): string | undefined {
  return process.env.BIFROST_MODEL_DEFAULT
}

export function getReviewModel(): string | undefined {
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

function canonicalMetadata(metadata?: BifrostMetadata): Record<string, string | number | boolean> | undefined {
  if (!metadata) return undefined

  const clean: Record<string, string | number | boolean> = {
    application: metadata.application || APPLICATION_NAME,
    workload: metadata.workload,
    origin: metadata.origin,
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined && key !== "application") clean[key] = value
  }

  return clean
}

/** Primitiva única de requisição HTTP do Bifrost */
async function requestBifrost(
  endpoint: string,
  method: "GET" | "POST",
  body?: unknown,
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
      throw new BifrostHttpError(res.status, errText)
    }

    const text = await res.text()
    if (!text.trim()) return null

    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  } finally {
    clearTimeout(timer)
  }
}

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
    try {
      await requestBifrost("/v1/models", "GET", undefined, HEALTH_TIMEOUT_MS)
      return { ...base, connected: true }
    } catch {}
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
    ...(opts.metadata ? { metadata: canonicalMetadata(opts.metadata) } : {}),
  }

  const data = await requestBifrost("/v1/chat/completions", "POST", payload, CHAT_TIMEOUT_MS)
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Bifrost (CT109) retornou uma resposta vazia.")
  }
  return content
}

export async function completeText(opts: CompleteOptions): Promise<string> {
  return chatCompletions({ ...opts, json: false })
}

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

export async function bifrostChat(
  request: BifrostChatRequest,
): Promise<BifrostChatResponse> {
  const model = request.model || process.env.BIFROST_MODEL_DEFAULT?.trim()

  if (!model) {
    throw new Error("No Bifrost application model alias configured")
  }

  const payload = {
    ...request,
    model,
    ...(request.metadata ? { metadata: canonicalMetadata(request.metadata) } : {}),
  }

  const response = await requestBifrost("/v1/chat/completions", "POST", payload, CHAT_TIMEOUT_MS)
  return response as BifrostChatResponse
}
