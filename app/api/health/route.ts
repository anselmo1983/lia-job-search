import { NextResponse } from "next/server"
import fs from "node:fs"

import {
  ensureDataDirectory,
  getDataDirectory,
} from "@/lib/runtime/data-directory"

import {
  getStatus,
  isConfigured,
} from "@/lib/inference/bifrost"

export const dynamic = "force-dynamic"

// GET /api/health — liveness/operational check (CT223).
// Expõe APENAS informações não secretas: status, commit, diretório de dados
// e estado do Bifrost (CT109). Nunca retorna BIFROST_VIRTUAL_KEY, credenciais
// de provider ou o header Authorization.
export async function GET() {
  let dataDirectoryWritable = false

  try {
    const dir = ensureDataDirectory()
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK)
    dataDirectoryWritable = true
  } catch {
    dataDirectoryWritable = false
  }

  const bifrostStatus = await getStatus()

  return NextResponse.json({
    status: "ok",
    commit: process.env.APP_COMMIT || "unknown",
    dataDirectory: {
      configured: getDataDirectory(),
      writable: dataDirectoryWritable,
    },
    bifrost: {
      configured: isConfigured(),
      reachable: bifrostStatus.connected,
    },
  })
}
