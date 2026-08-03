import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"
import { dataPath } from "@/lib/runtime/data-directory"

// Política de validação do texto extraído
const MIN_EXTRACTED_CHARS = 200
const MAX_EXTRACTED_CHARS = 5000

// Mensagens de falha de extração que nunca devem ser aceitas como currículo
const PLACEHOLDER_PATTERNS = [
  /\[Não foi possível extrair texto do PDF\]/i,
  /\[PDFParse não disponível\]/i,
]

export async function POST(request: Request) {
  let savedPath: string | null = null

  // Arquivo inválido: remove o que foi persistido — nada de lixo silencioso.
  async function discardSavedFile() {
    if (!savedPath) return
    await fs.unlink(savedPath).catch(() => {})
    savedPath = null
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })

    const originalName = file.name || "resume.pdf"
    const fileName = path.basename(originalName)
    const lowerName = fileName.toLowerCase()
    if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".txt")) {
      return NextResponse.json(
        { error: "Formato não suportado. Envie um arquivo .pdf ou .txt." },
        { status: 400 },
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    if (buffer.length === 0) {
      return NextResponse.json({ error: "O arquivo está vazio." }, { status: 400 })
    }

    // Persistir em $LIA_DATA_DIR/documents/cv (fallback /tmp em serverless)
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const savedName = `uploaded_${Date.now()}_${safeName}`
    try {
      savedPath = dataPath("documents", "cv", savedName)
      await fs.mkdir(path.dirname(savedPath), { recursive: true })
      await fs.writeFile(savedPath, buffer)
    } catch {
      savedPath = path.join("/tmp", savedName)
      try {
        await fs.writeFile(savedPath, buffer)
      } catch {
        savedPath = null // segue sem persistir — o texto já está em memória
      }
    }

    let text = ""
    if (lowerName.endsWith(".pdf")) {
      try {
        // Extrair texto com pdf-parse v2
        const { PDFParse } = await import("pdf-parse")
        if (!PDFParse) throw new Error("pdf-parse não disponível no servidor")
        const parser = new PDFParse({ data: buffer })
        try {
          const result = await parser.getText()
          text = result?.text || ""
        } finally {
          await parser.destroy().catch(() => {})
        }
      } catch {
        // Falha de parsing = erro HTTP explícito, NUNCA success=true com placeholder
        await discardSavedFile()
        return NextResponse.json(
          {
            success: false,
            error:
              "Não foi possível extrair o texto do PDF. O arquivo pode ser escaneado (imagem) ou estar corrompido. Envie um PDF com texto selecionável ou um arquivo .txt.",
          },
          { status: 422 },
        )
      }
    } else {
      text = buffer.toString("utf8")
    }

    // Rejeitar placeholders de falha como se fossem currículo válido
    const normalized = text.replace(/\s+/g, " ")
    if (PLACEHOLDER_PATTERNS.some((p) => p.test(normalized))) {
      await discardSavedFile()
      return NextResponse.json(
        {
          success: false,
          error:
            "O arquivo parece conter o resultado de uma extração anterior com erro, não um currículo. Envie o PDF original ou um arquivo .txt com o texto do currículo.",
        },
        { status: 422 },
      )
    }

    const trimmed = text.trim()
    const charCount = trimmed.length

    // Texto extraído curto/inválido => erro explícito
    if (charCount < MIN_EXTRACTED_CHARS) {
      await discardSavedFile()
      return NextResponse.json(
        {
          success: false,
          error: `Texto extraído muito curto (${charCount} caracteres). Verifique se o arquivo contém o currículo completo.`,
        },
        { status: 422 },
      )
    }

    const truncated = charCount > MAX_EXTRACTED_CHARS
    const extractedText = truncated ? trimmed.substring(0, MAX_EXTRACTED_CHARS) : trimmed

    return NextResponse.json({
      success: true,
      fileName,
      charCount,
      truncated,
      extractedText,
    })
  } catch (error) {
    await discardSavedFile()
    return NextResponse.json(
      { success: false, error: "Falha no upload. Tente novamente." },
      { status: 500 },
    )
  }
}
