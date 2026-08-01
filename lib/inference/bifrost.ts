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

export function isConfigured(): boolean {
  return Boolean(process.env.BIFROST_BASE_URL && process.env.BIFROST_VIRTUAL_KEY)
}

export function getDefaultModel(): string {
  return process.env.BIFROST_MODEL_DEFAULT || "gpt-4o-mini"
}

export function getReviewModel(): string {
  return process.env.BIFROST_MODEL_REVIEW || "gpt-4o"
}

function baseUrl(): string {
  return (process.env.BIFROST_BASE_URL || "").replace(/\/+$/, "")
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Verifica conectividade com o CT109 e expõe apenas informações não secretas. */
export async function getStatus(): Promise<BifrostStatus> {
  const base = {
    authority: AUTHORITY,
    credentialMode: CREDENTIAL_MODE,
    defaultModel: getDefaultModel(),
    reviewModel: getReviewModel(),
  }

  if (!isConfigured()) {
    return {
      ...base,
      connected: false,
      message: "Bifrost não configurado no servidor (BIFROST_BASE_URL / BIFROST_VIRTUAL_KEY)",
    }
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${process.env.BIFROST_VIRTUAL_KEY}` }

  try {
    const health = await fetchWithTimeout(`${baseUrl()}/health`, { headers }, HEALTH_TIMEOUT_MS)
    if (health.ok) return { ...base, connected: true }
  } catch {
    // tenta o endpoint de modelos abaixo
  }

  try {
    const models = await fetchWithTimeout(`${baseUrl()}/v1/models`, { headers }, HEALTH_TIMEOUT_MS)
    if (models.ok) return { ...base, connected: true }
  } catch {
    // sem conectividade
  }

  return { ...base, connected: false, message: "Não foi possível conectar ao Bifrost (CT109)" }
}

async function chatCompletions(opts: CompleteOptions): Promise<string> {
  if (!isConfigured()) {
    throw new Error("Inferência indisponível: Bifrost (CT109) não configurado no servidor (BIFROST_BASE_URL / BIFROST_VIRTUAL_KEY).")
  }

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

  const res = await fetchWithTimeout(
    `${baseUrl()}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BIFROST_VIRTUAL_KEY}`,
      },
      body: JSON.stringify({
        model: opts.model || getDefaultModel(),
        messages,
        max_tokens: opts.maxTokens ?? 2000,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    },
    CHAT_TIMEOUT_MS,
  )

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Bifrost (CT109) retornou ${res.status}: ${body.slice(0, 300)}`)
  }

  const data = await res.json()
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
