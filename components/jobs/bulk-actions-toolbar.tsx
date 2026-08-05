"use client"

import { useState } from "react"
import { CheckSquare, X, RefreshCw, Archive, Bookmark, CheckCircle2, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchWithAuth } from "@/lib/auth/client-guard"

interface BulkActionsToolbarProps {
  selectedJobIds: string[]
  onClearSelection: () => void
  onBulkCompleted: () => void
}

export function BulkActionsToolbar({
  selectedJobIds,
  onClearSelection,
  onBulkCompleted,
}: BulkActionsToolbarProps) {
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)

  if (selectedJobIds.length === 0) return null

  async function handleBulkStatus(targetStatus: string) {
    if (loading) return
    setLoading(true)
    setActiveAction(targetStatus)
    try {
      const res = await fetchWithAuth("/api/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          jobIds: selectedJobIds,
          targetStatus,
          notes: `Atualização em lote (${selectedJobIds.length} vagas)`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onBulkCompleted()
        onClearSelection()
      }
    } catch (err) {
      console.error("Erro na ação em lote de status:", err)
    }
    setLoading(false)
    setActiveAction(null)
  }

  async function handleBulkRescore() {
    if (loading) return
    setLoading(true)
    setActiveAction("rescore")
    try {
      const res = await fetchWithAuth("/api/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rescore",
          jobIds: selectedJobIds,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onBulkCompleted()
      }
    } catch (err) {
      console.error("Erro no recálculo em lote:", err)
    }
    setLoading(false)
    setActiveAction(null)
  }

  async function handleBulkArchive() {
    if (loading) return
    setLoading(true)
    setActiveAction("archive")
    try {
      const res = await fetchWithAuth("/api/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "archive",
          jobIds: selectedJobIds,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onBulkCompleted()
        onClearSelection()
      }
    } catch (err) {
      console.error("Erro no arquivamento em lote:", err)
    }
    setLoading(false)
    setActiveAction(null)
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/95 p-3 px-5 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
        <CheckSquare className="h-5 w-5 text-emerald-400" />
        <span className="text-xs font-bold">{selectedJobIds.length} selecionadas</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={() => handleBulkStatus("bookmarked")}
          className="gap-1 text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
        >
          {loading && activeAction === "bookmarked" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bookmark className="h-3.5 w-3.5 text-blue-400" />}
          <span>Salvar</span>
        </Button>

        <Button
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={() => handleBulkStatus("applied")}
          className="gap-1 text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
        >
          {loading && activeAction === "applied" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />}
          <span>Marcar Aplicado</span>
        </Button>

        <Button
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={handleBulkRescore}
          className="gap-1 text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
        >
          {loading && activeAction === "rescore" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 text-amber-400" />}
          <span>Re-calcular Fit</span>
        </Button>

        <Button
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={handleBulkArchive}
          className="gap-1 text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
        >
          {loading && activeAction === "archive" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5 text-slate-400" />}
          <span>Arquivar</span>
        </Button>
      </div>

      <button
        onClick={onClearSelection}
        className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
        title="Cancelar Seleção"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
