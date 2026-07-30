import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { apiKey, jobs, model = "kimi-k2.6" } = await request.json()
    if (!apiKey) return NextResponse.json({ error: "API key necessária" }, { status: 400 })
    if (!jobs?.length) return NextResponse.json({ error: "Lista de vagas vazia" }, { status: 400 })

    const OpenAI = (await import("openai")).default
    const client = new OpenAI({ apiKey, baseURL: "https://api.moonshot.ai/v1" })

    // 1. Build JSONL input file in memory
    const lines = jobs.map((job: any, i: number) => JSON.stringify({
      custom_id: `job_${i}`,
      method: "POST",
      url: "/v1/chat/completions",
      body: {
        model,
        messages: [
          {
            role: "system",
            content: `Você é um analista de vagas. Para cada vaga, avalie o fit com o perfil do candidato.
Retorne JSON: {fitScore:0-100, verdict, strengths:[string], gaps:[string], recommendation}
Depois gere um currículo adaptado em Markdown e uma carta de apresentação.`
          },
          {
            role: "user",
            content: `Avalie esta vaga e gere documentos:
Título: ${job.title}
Empresa: ${job.company}
Local: ${job.location || "N/A"}
Descrição: ${job.description || "N/A"}
URL: ${job.url || "N/A"}`
          }
        ]
      }
    }))

    const jsonlContent = lines.join("\n")

    // 2. Upload file to Moonshot
    const blob = new Blob([jsonlContent], { type: "application/jsonl" })
    const file = new File([blob], `batch_${Date.now()}.jsonl`, { type: "application/jsonl" })

    // Usar fetch diretamente para upload de arquivo
    const formData = new FormData()
    formData.append("purpose", "batch")
    formData.append("file", file)

    const uploadRes = await fetch("https://api.moonshot.ai/v1/files", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: formData
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      return NextResponse.json({ error: `Upload failed: ${errText}` }, { status: 500 })
    }

    const fileData = await uploadRes.json()
    const fileId = fileData.id

    // 3. Create batch task
    const batchRes = await fetch("https://api.moonshot.ai/v1/batches", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input_file_id: fileId,
        endpoint: "/v1/chat/completions",
        completion_window: "24h"
      })
    })

    if (!batchRes.ok) {
      const errText = await batchRes.text()
      return NextResponse.json({ error: `Batch creation failed: ${errText}` }, { status: 500 })
    }

    const batchData = await batchRes.json()

    return NextResponse.json({
      success: true,
      batchId: batchData.id,
      fileId,
      status: batchData.status,
      totalJobs: jobs.length,
      estimatedSavings: "40% vs. chamadas individuais"
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// GET: consultar status de um batch
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get("batchId")
    const apiKey = searchParams.get("apiKey")
    
    if (!batchId || !apiKey) {
      return NextResponse.json({ error: "batchId e apiKey são necessários" }, { status: 400 })
    }

    const res = await fetch(`https://api.moonshot.ai/v1/batches/${batchId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Falha ao consultar batch" }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({
      batchId: data.id,
      status: data.status,
      requestCounts: data.request_counts,
      outputFileId: data.output_file_id,
      errorFileId: data.error_file_id,
      createdAt: data.created_at,
      completedAt: data.completed_at
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
