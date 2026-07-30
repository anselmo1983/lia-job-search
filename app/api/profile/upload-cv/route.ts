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
    
    // Salvar na pasta documents/cv/
    const fileName = `uploaded_${Date.now()}_${file.name}`
    const filePath = path.join(process.cwd(), "documents", "cv", fileName)
    await fs.writeFile(filePath, buffer)
    
    // Extrair texto se for PDF
    let text = ""
    if (file.name.endsWith(".pdf")) {
      try {
        const { PDFParse } = await import("pdf-parse")
        const parser = new PDFParse(buffer)
        const pageTexts = await parser.getText()
        text = Array.isArray(pageTexts) ? pageTexts.join("\n") : String(pageTexts || "")
      } catch (e) {
        text = "[Não foi possível extrair texto do PDF: " + String(e).substring(0, 100) + "]"
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
