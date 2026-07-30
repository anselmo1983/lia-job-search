import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { text, apiKey, provider } = await request.json()
    if (!apiKey) return NextResponse.json({ error: "API key é necessária" }, { status: 400 })
    
    let extractedProfile: any
    
    if (provider === "openai") {
      const OpenAI = (await import("openai")).default
      const openai = new OpenAI({ apiKey })
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Extraia um perfil profissional estruturado deste currículo. Retorne JSON com: name, email, phone, location, languages, education (array de {degree, field, institution, year}), experience (array de {title, company, period, achievements}), skills (primary[], secondary[]), certifications[], linkedin" },
          { role: "user", content: text }
        ],
        response_format: { type: "json_object" }
      })
      extractedProfile = JSON.parse(response.choices[0].message.content || "{}")
    } else if (provider === "anthropic") {
      const Anthropic = (await import("@anthropic-ai/sdk")).default
      const anthropic = new Anthropic({ apiKey })
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: `Extraia um perfil profissional estruturado. Retorne APENAS JSON com: {name, email, phone, location, languages, education: [{degree, field, institution, year}], experience: [{title, company, period, achievements:[string]}], skills: {primary:[], secondary:[]}, certifications:[{name, year}]}\n\nCurrículo:\n${text}` }]
      })
      const content = response.content[0]
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        extractedProfile = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Falha ao extrair JSON da resposta" }
      }
    }
    
    return NextResponse.json({ profile: extractedProfile })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
