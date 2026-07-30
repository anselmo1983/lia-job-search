import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Salvar na pasta documents/cv/ (pode falhar em serverless)
    let fileName = `uploaded_${Date.now()}_${file.name}`
    let filePath = ""
    try {
      filePath = path.join(process.cwd(), "documents", "cv", fileName)
      await fs.writeFile(filePath, buffer)
    } catch (e) {
      // Vercel serverless: fallback para /tmp
      try {
        filePath = path.join("/tmp", fileName)
        await fs.writeFile(filePath, buffer)
      } catch {}
    }
    
    let text = ""
    if (file.name.endsWith(".pdf")) {
      try {
        // Extrair texto com pdf-parse v2
        const { PDFParse } = await import("pdf-parse")
        if (!PDFParse) {
          text = "[PDFParse não disponível]"
        } else {
          const parser = new PDFParse({ data: buffer })
          try {
            const result = await parser.getText()
            text = result.text
          } finally {
            await parser.destroy()
          }
        }
      } catch (e) {
        text = "[Não foi possível extrair texto do PDF]"
      }
    } else if (file.name.endsWith(".txt")) {
      text = buffer.toString("utf8")
    }
    
    return NextResponse.json({ 
      success: true, 
      fileName, 
      filePath,
      extractedText: text.substring(0, 5000) // primeiros 5000 chars
    })
  } catch (error) {
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 })
  }
}
