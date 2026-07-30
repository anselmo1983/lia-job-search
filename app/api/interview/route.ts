import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { job, cv, apiKey, provider } = await request.json()
    if (!apiKey) return NextResponse.json({ error: "API key necessária" }, { status: 400 })
    
    const OpenAI = (await import("openai")).default
    const openai = new OpenAI({ apiKey })
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
