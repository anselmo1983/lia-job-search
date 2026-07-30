import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { query, location, apiKey, provider = "openai", model } = await request.json()
    if (!apiKey) return NextResponse.json({ error: "API key necessária" }, { status: 400 })
    
    const OpenAI = (await import("openai")).default
    const baseURL = provider === "kimi" ? "https://api.moonshot.ai/v1" : undefined
    const openai = new OpenAI({ apiKey, baseURL })
    const m = model || (provider === "kimi" ? "kimi-k2.6" : "gpt-4o-mini")
    
    const response = await openai.chat.completions.create({
      model: m,
      messages: [
        { role: "system", content: "Você é um buscador de vagas. Retorne JSON: {results: [{title, company, location, url, description, date, source}]}. Busque APENAS vagas reais e atuais." },
        { role: "user", content: `Busque vagas para "${query}" em "${location || "Brasil"}", retorne até 10 resultados reais com URLs.` }
      ],
      response_format: { type: "json_object" }
    })
    
    const result = JSON.parse(response.choices[0].message.content || "{}")
    
    return NextResponse.json({ 
      results: (result.results || []).map((r: any, i: number) => ({
        id: `scraped_${Date.now()}_${i}`,
        title: r.title,
        company: r.company,
        location: r.location,
        url: r.url,
        description: r.description || "",
        date: r.date || new Date().toISOString().split("T")[0],
        source: r.source || "web",
        status: "discovered",
        fit: "unrated",
        score: null
      }))
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
