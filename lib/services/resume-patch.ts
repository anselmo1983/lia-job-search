import { JsonPatchOperation, ResumeDocument, ResumeDocumentSchema } from "@/lib/db/resume-schema"

/**
 * Utilitário leve de interpretação de JSON Pointer (RFC 6901) e JSON Patch (RFC 6902)
 */
export function getByPointer(obj: any, pointer: string): any {
  if (!pointer || pointer === "/") return obj
  const tokens = pointer.split("/").slice(1).map((t) => t.replace(/~1/g, "/").replace(/~0/g, "~"))
  let curr = obj
  for (const token of tokens) {
    if (curr === undefined || curr === null) return undefined
    curr = curr[token]
  }
  return curr
}

export function applySinglePatch(target: any, op: JsonPatchOperation): any {
  const clone = JSON.parse(JSON.stringify(target))
  const path = op.path
  if (!path || path === "/") {
    if (op.op === "replace" || op.op === "add") return op.value
    return clone
  }

  const tokens = path.split("/").slice(1).map((t) => t.replace(/~1/g, "/").replace(/~0/g, "~"))
  const lastToken = tokens.pop()!

  let parent = clone
  for (const token of tokens) {
    if (parent[token] === undefined) {
      if (op.op === "add") parent[token] = {}
      else throw new Error(`Caminho não encontrado no patch: ${op.path}`)
    }
    parent = parent[token]
  }

  switch (op.op) {
    case "add":
    case "replace": {
      if (Array.isArray(parent)) {
        if (lastToken === "-") {
          parent.push(op.value)
        } else {
          const index = parseInt(lastToken, 10)
          if (isNaN(index)) throw new Error(`Índice inválido no array para patch: ${lastToken}`)
          if (op.op === "add") parent.splice(index, 0, op.value)
          else parent[index] = op.value
        }
      } else {
        parent[lastToken] = op.value
      }
      break
    }
    case "remove": {
      if (Array.isArray(parent)) {
        const index = parseInt(lastToken, 10)
        if (isNaN(index)) throw new Error(`Índice inválido no array para remoção: ${lastToken}`)
        parent.splice(index, 1)
      } else {
        delete parent[lastToken]
      }
      break
    }
    case "move": {
      if (!op.from) throw new Error("Operação 'move' exige o parâmetro 'from'")
      const val = getByPointer(clone, op.from)
      const afterRemove = applySinglePatch(clone, { op: "remove", path: op.from })
      return applySinglePatch(afterRemove, { op: "add", path: op.path, value: val })
    }
    case "copy": {
      if (!op.from) throw new Error("Operação 'copy' exige o parâmetro 'from'")
      const val = getByPointer(clone, op.from)
      return applySinglePatch(clone, { op: "add", path: op.path, value: val })
    }
    case "test": {
      const currentVal = getByPointer(clone, op.path)
      if (JSON.stringify(currentVal) !== JSON.stringify(op.value)) {
        throw new Error(`Teste de patch falhou em ${op.path}`)
      }
      break
    }
  }

  return clone
}

export function applyJsonPatch(
  doc: ResumeDocument,
  patches: JsonPatchOperation[]
): { patchedDocument: ResumeDocument; appliedCount: number } {
  let current: any = JSON.parse(JSON.stringify(doc))
  let appliedCount = 0

  for (const op of patches) {
    current = applySinglePatch(current, op)
    appliedCount++
  }

  // Garantir que a data de atualização seja atualizada
  current.updatedAt = new Date().toISOString()

  // Validação final de contrato via Zod
  const validated = ResumeDocumentSchema.parse(current)

  return {
    patchedDocument: validated,
    appliedCount,
  }
}

export function generatePatchSummary(patches: JsonPatchOperation[]): string {
  if (patches.length === 0) return "Nenhuma alteração efetuada"
  const ops = patches.map((p) => `${p.op.toUpperCase()} ${p.path}`)
  if (ops.length <= 3) return ops.join(", ")
  return `${ops.slice(0, 3).join(", ")} e +${ops.length - 3} alterações`
}
