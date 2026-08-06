"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global App Boundary Error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0E1418] p-6 text-[#F2F4F3]">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/15 text-amber-400 border border-amber-400/20">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Ocorreu um erro inesperado</h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          Sua sessão permaneceu segura. Não foi possível processar a requisição atual no momento.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </Button>
          <Link href="/login" className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:border-emerald-400/40">
            Ir para Login
          </Link>
        </div>
      </div>
    </div>
  )
}
