import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { job, cv, apiKey, provider = "openai", model } = await request.json()
    if (!apiKey) return NextResponse.json({ error: "API key necessária" }, { status: 400 })

    if (provider === "anthropic") {
      const Anthropic = (await import("@anthropic-ai/sdk")).default
      const anthropic = new Anthropic({ apiKey })
      const response = await anthropic.messages.create({
        model: model || "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: `Prepare o candidato para entrevista. Retorne APENAS JSON: {questions:[{question, context, suggestedAnswer}], talkingPoints:[string], companyResearch:[string]}\n\nVaga: ${job.title} na ${job.company}\n\nDescrição: ${job.description || ""}\n\nCurrículo:\n${cv || ""}` }]
      })
      const content = response.content[0]
      const text = content.type === "text" ? content.text : ""
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      return NextResponse.json(jsonMatch ? JSON.parse(jsonMatch[0]) : {})
    }

    const OpenAI = (await import("openai")).default
    const baseURL = provider === "kimi" ? "https://api.moonshot.ai/v1" : undefined
    const openai = new OpenAI({ apiKey, baseURL })
    const m = model || (provider === "kimi" ? "kimi-k2.6" : "gpt-4o-mini")

    const response = await openai.chat.completions.create({
      model: m,
      messages: [
        { role: "system", content: "Prepare o candidato para entrevista. Retorne JSON: {questions:[{question, context, suggestedAnswer}], talkingPoints:[string], companyResearch:[string], salaryExpectations:string}" },
        { role: "user", content: `Vaga: ${job.title} na ${job.company}\n\nDescrição: ${job.description || ""}\n\nCurrículo do candidato:\n${cv || ""}` }
      ],
      response_format: { type: "json_object" }
    })

    return NextResponse.json(JSON.parse(response.choices[0].message.content || "{}"))
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
