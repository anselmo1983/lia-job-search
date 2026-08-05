import fs from "node:fs"
import { promises as fsPromises } from "node:fs"
import os from "node:os"
import path from "node:path"

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data")

export function getDataDirectory(): string {
  const fromEnv = process.env.LIA_DATA_DIR?.trim()
  if (fromEnv) return fromEnv

  if (process.env.VERCEL === "1" || process.env.VERCEL_ENV) {
    return path.join(os.tmpdir(), "lia-data")
  }

  return DEFAULT_DATA_DIR
}

export function ensureDataDirectory(): string {
  const dir = getDataDirectory()
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    return dir
  } catch {
    const tmpDir = path.join(os.tmpdir(), "lia-data")
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }
      return tmpDir
    } catch {
      return dir
    }
  }
}

export function dataPath(...segments: string[]): string {
  return path.join(ensureDataDirectory(), ...segments)
}

// In-process lock map to prevent concurrent writes to the same file path.
const writeLocks = new Map<string, Promise<void>>()

export async function writeAtomic(filePath: string, data: any): Promise<void> {
  const currentLock = writeLocks.get(filePath) || Promise.resolve()

  let resolveLock: () => void = () => {}
  const newLock = new Promise<void>((resolve) => {
    resolveLock = resolve
  })
  writeLocks.set(filePath, newLock)

  try {
    await currentLock
    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`
    await fsPromises.mkdir(path.dirname(filePath), { recursive: true })
    await fsPromises.writeFile(tempPath, JSON.stringify(data, null, 2), "utf8")
    await fsPromises.rename(tempPath, filePath)
  } finally {
    resolveLock()
    if (writeLocks.get(filePath) === newLock) {
      writeLocks.delete(filePath)
    }
  }
}
