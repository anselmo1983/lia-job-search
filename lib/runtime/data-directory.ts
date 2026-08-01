import fs from "node:fs"
import path from "node:path"

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data")

export function getDataDirectory(): string {
  return process.env.LIA_DATA_DIR?.trim() || DEFAULT_DATA_DIR
}

export function ensureDataDirectory(): string {
  const dir = getDataDirectory()
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function dataPath(...segments: string[]): string {
  return path.join(ensureDataDirectory(), ...segments)
}
