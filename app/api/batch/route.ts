import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { completeJson, getDefaultModel } from "@/lib/inference/bifrost"
import { requireSession } from "@/lib/auth/server"

// CT223 — batch de vagas. Arquitetura: UI → CT223 → lib/inference/bifrost.ts → CT109.
// Nenhum provider direto (Moonshot/OpenAI/Anthropic). Provider/model routing
// pertence ao Bifrost — o cliente não envia modelo.
//
// Processamento é SEQUENCIAL por enquanto (não há batch nativo do Moonshot).
// O estado do lote é mantido em memória do processo (perdido ao reiniciar o
// servidor) — adequado ao deployment canônico (servidor de longa duração).

interface BatchJob {
  id: string
  title: string
  company?: string
  description?: string
  url?: string
  location?: string
}

interface BatchItem {
  id: string
  title: string
  company: string
  evaluation?: unknown
  error?: string
}

interface BatchEntry {
  batchId: string
  status: "in_progress" | "completed" | "failed"
  totalJobs: number
  requestCounts: { total: number; completed: number; failed: number }
  results: BatchItem[]
  createdAt: number
}

const batches = new Map<string, BatchEntry>()
const MAX_BATCH_JOBS = 25
const BATCH_TTL_MS = 24 * 60 * 60 * 1000 // 24h

function pruneBatches() {
  const now = Date.now()
  for (const [id, entry] of batches) {
    if (now - entry.createdAt > BATCH_TTL_MS) batches.delete(id)
  }
}

const SYSTEM_PROMPT = `Você é um analista de vagas. Para cada vaga, avalie o fit com o perfil do candidato.
Retorne APENAS JSON com a estrutura:
{
  "fitScore": 0-100,
  "verdict": string,
  "strengths": [string],
  "gaps": [string],
  "recommendation": string
}
Se a descrição da vaga não permitir avaliar, use fitScore 0 e explique no verdict.`

async function processBatch(batchId: string, jobs: BatchJob[]) {
  const entry = batches.get(batchId)
  if (!entry) return

  for (const job of jobs) {
    const item = entry.results.find((r) => r.id === job.id)
    try {
      const evaluation = await completeJson({
        model: getDefaultModel(),
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Avalie esta vaga e retorne o fit:
Título: ${job.title}
Empresa: ${job.company || "N/A"}
Local: ${job.location || "N/A"}
Descrição: ${job.description || "N/A"}
URL: ${job.url || "N/A"}`,
          },
        ],
        maxTokens: 2000,
      })
      if (item) {
        item.evaluation = evaluation
        item.error = undefined
      }
      entry.requestCounts.completed++
    } catch (e) {
      if (item) item.error = e instanceof Error ? e.message : String(e)
      entry.requestCounts.failed++
    }
  }

  entry.status = entry.requestCounts.failed === entry.totalJobs ? "failed" : "completed"
}

export async function POST(request: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized
  try {
    const { jobs } = await request.json()
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ error: "Lista de vagas vazia" }, { status: 400 })
    }
    if (jobs.length > MAX_BATCH_JOBS) {
      return NextResponse.json({ error: `Máximo de ${MAX_BATCH_JOBS} vagas por lote (sequencial)` }, { status: 400 })
    }

    pruneBatches()

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const entry: BatchEntry = {
      batchId,
      status: "in_progress",
      totalJobs: jobs.length,
      requestCounts: { total: jobs.length, completed: 0, failed: 0 },
      results: jobs.map((j: BatchJob) => ({
        id: j.id || `job_${Math.random().toString(36).slice(2, 8)}`,
        title: j.title || "(sem título)",
        company: j.company || "",
      })),
      createdAt: Date.now(),
    }
    batches.set(batchId, entry)

    // Processamento em segundo plano (sequencial via Bifrost)
    void processBatch(batchId, jobs as BatchJob[])

    return NextResponse.json({
      success: true,
      batchId,
      status: entry.status,
      totalJobs: entry.totalJobs,
      requestCounts: entry.requestCounts,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// GET: consultar status de um batch (estado em memória)
export async function GET(request: Request) {
  const unauthorized = await requireSession()
  if (unauthorized) return unauthorized
  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get("batchId")
    if (!batchId) return NextResponse.json({ error: "batchId é necessário" }, { status: 400 })

    const entry = batches.get(batchId)
    if (!entry) {
      return NextResponse.json(
        { error: "Batch não encontrado — o estado é mantido em memória e foi perdido (servidor reiniciou?)" },
        { status: 404 },
      )
    }

    return NextResponse.json({
      batchId: entry.batchId,
      status: entry.status,
      totalJobs: entry.totalJobs,
      requestCounts: entry.requestCounts,
      results: entry.results,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
