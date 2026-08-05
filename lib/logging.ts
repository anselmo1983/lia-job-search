/**
 * Utilitário de logging estruturado (JSON) para o Lia Job Search.
 *
 * Emite logs formatados em JSON compatíveis com Vercel Function Logs,
 * CloudWatch, e stdout/stderr de containers Docker (CT223).
 */

export type LogLevel = "info" | "warn" | "error" | "debug"

export interface LogPayload {
  message: string
  context?: string
  data?: Record<string, unknown>
  error?: Error | unknown
  [key: string]: unknown
}

function formatLog(level: LogLevel, payload: LogPayload): string {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    app: "lia-job-search",
    env: process.env.NODE_ENV || "development",
    ...payload,
    error: payload.error instanceof Error ? {
      name: payload.error.name,
      message: payload.error.message,
      stack: payload.error.stack,
    } : payload.error,
  }

  return JSON.stringify(logEntry)
}

export const logger = {
  info(message: string, context?: string, data?: Record<string, unknown>) {
    console.log(formatLog("info", { message, context, data }))
  },
  warn(message: string, context?: string, data?: Record<string, unknown>) {
    console.warn(formatLog("warn", { message, context, data }))
  },
  error(message: string, error?: Error | unknown, context?: string, data?: Record<string, unknown>) {
    console.error(formatLog("error", { message, error, context, data }))
  },
  debug(message: string, context?: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLog("debug", { message, context, data }))
    }
  },
}
