"use client"

import { useState, useEffect, FormEvent, useCallback } from "react"
import { Upload, User, Loader2, CheckCircle2, XCircle, ShieldCheck, Server, FileText, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/app-shell"
import { Button } from "@/components/ui/button"

const MIN_PROFILE_CHARS = 200

interface BifrostInfo {
  connected: boolean
  authority: string
  credentialMode: string
  defaultModel: string
  reviewModel: string
}

const emptyBifrost: BifrostInfo = {
  connected: false,
  authority: "CT109 Bifrost",
  credentialMode: "server-side",
  defaultModel: "Not configured",
  reviewModel: "Not configured",
}

function hasContent(v: unknown): boolean {
  return typeof v === "string" ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : false
}

function isValidProfile(p: any): boolean {
  if (!p || typeof p !== "object" || Array.isArray(p)) return false
  return (
    hasContent(p.name) ||
    hasContent(p.email) ||
    hasContent(p.phone) ||
    hasContent(p.location) ||
    hasContent(p.languages) ||
    hasContent(p.skills?.primary) ||
    hasContent(p.skills?.secondary) ||
    hasContent(p.experience) ||
    hasContent(p.education) ||
    hasContent(p.certifications)
  )
}

export default function SettingsPage() {
  const [bifrost, setBifrost] = useState<BifrostInfo>(emptyBifrost)
  const [statusLoading, setStatusLoading] = useState(true)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [uploadedFile, setUploadedFile] = useState("")
  const [charCount, setCharCount] = useState(0)
  const [truncated, setTruncated] = useState(false)
  const [profileText, setProfileText] = useState("")

  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [extracted, setExtracted] = useState(false)

  const loadStatus = useCallback(async () => {
    setStatusLoading(true)
    try {
      const res = await fetch("/api/inference/status")
      const data = await res.json()
      setBifrost({ ...emptyBifrost, ...data })
    } catch {
      setBifrost(emptyBifrost)
    }
    setStatusLoading(false)
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]')
    if (!fileInput?.files?.[0]) return

    setUploading(true)
    setUploadError("")
    setExtractError("")
    setProfile(null)
    setExtracted(false)
    setProfileText("")
    setCharCount(0)
    setTruncated(false)
    setUploadedFile("")

    try {
      const fd = new FormData()
      fd.append("file", fileInput.files[0])
      const res = await fetch("/api/profile/upload-cv", { method: "POST", body: fd })
      const data = await res.json()
      if (res.ok && data.success) {
        setUploadedFile(data.fileName)
        setProfileText(data.extractedText || "")
        setCharCount(data.charCount || 0)
        setTruncated(Boolean(data.truncated))
      } else {
        setUploadError(data.error || "Falha no upload. Tente novamente.")
      }
    } catch {
      setUploadError("Falha no upload. Tente novamente.")
    }
    setUploading(false)
  }

  async function extractProfile() {
    if (!profileText || profileText.length < MIN_PROFILE_CHARS || extracting) return
    setExtracting(true)
    setExtractError("")
    setProfile(null)
    setExtracted(false)
    try {
      const res = await fetch("/api/profile/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: profileText }),
      })
      const data = await res.json()
      if (res.ok && data.profile && isValidProfile(data.profile)) {
        setProfile(data.profile)
        setExtracted(true)
      } else {
        setExtractError(data.error || "Não foi possível extrair um perfil válido do currículo.")
      }
    } catch {
      setExtractError("Erro ao extrair perfil. Tente novamente.")
    }
    setExtracting(false)
  }

  const readyToExtract = profileText.length >= MIN_PROFILE_CHARS

  return (
    <>
      <PageHeader title="Configurações" description="Upload de currículo, extração de perfil e status da inferência." />

      {/* Bifrost — leitura somente */}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-teal" />
            <h2 className="font-heading font-semibold">Inferência (Bifrost)</h2>
          </div>
          <div className="flex items-center gap-2">
            {statusLoading ? (
              <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs text-silver">
                <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
              </span>
            ) : (
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${bifrost.connected ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"}`}>
                {bifrost.connected ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {bifrost.connected ? "Connected" : "Disconnected"}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={loadStatus} disabled={statusLoading} aria-label="Recarregar status">
              <RefreshCw className={`h-3.5 w-3.5 ${statusLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-950 p-3">
            <p className="text-xs text-silver">Inference authority</p>
            <p className="mt-1 font-mono text-sm text-cloud">{bifrost.authority}</p>
          </div>
          <div className="rounded-lg bg-slate-950 p-3">
            <p className="text-xs text-silver">Credential mode</p>
            <p className="mt-1 font-mono text-sm text-cloud capitalize">{bifrost.credentialMode}</p>
          </div>
          <div className="rounded-lg bg-slate-950 p-3">
            <p className="text-xs text-silver">Default model</p>
            <p className="mt-1 font-mono text-sm text-cloud">{bifrost.defaultModel}</p>
          </div>
          <div className="rounded-lg bg-slate-950 p-3">
            <p className="text-xs text-silver">Review model</p>
            <p className="mt-1 font-mono text-sm text-cloud">{bifrost.reviewModel}</p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-teal/20 bg-teal/5 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
          <p className="text-xs text-silver">
            As credenciais são gerenciadas no servidor (<span className="font-mono text-cloud">CT109 Bifrost</span>) — nenhuma chave (VK) é
            armazenada ou exposta no navegador.
          </p>
        </div>
      </section>

      {/* Upload CV */}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="h-5 w-5 text-teal" />
          <h2 className="font-heading font-semibold">Upload de Currículo</h2>
        </div>
        <p className="mb-4 text-sm text-silver">Envie seu PDF ou TXT. O currículo é armazenado de forma privada no CT223 e utilizado para extração e análise do perfil.</p>
        <form onSubmit={handleUpload} className="flex flex-col gap-3 sm:flex-row">
          <input className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-teal/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-teal hover:file:bg-teal/20" type="file" accept=".pdf,.txt" />
          <Button type="submit" disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Enviando..." : "Upload"}
          </Button>
        </form>

        {uploadError && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {uploadError}
          </p>
        )}

        {profileText && (
          <div className="mt-4">
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-emerald-400/10 p-3 text-sm text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {uploadedFile} — <strong>{charCount.toLocaleString("pt-BR")} caracteres</strong> extraídos
                {truncated ? ` (arquivo maior; usando os primeiros ${profileText.length.toLocaleString("pt-BR")})` : ""}.
                Pronto para extrair o perfil.
              </span>
            </div>

            <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-950 p-3">
              <FileText className="h-4 w-4 shrink-0 text-teal" />
              <p className="text-xs text-silver">
                Texto extraído: <span className="font-mono text-cloud">{profileText.length.toLocaleString("pt-BR")} caracteres</span>
              </p>
            </div>

            <Button onClick={extractProfile} disabled={extracting || !readyToExtract}>
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
              {extracting ? "Extraindo..." : "Extrair Perfil Automaticamente"}
            </Button>

            {!readyToExtract && (
              <p className="mt-2 text-xs text-amber-400">
                Mínimo de {MIN_PROFILE_CHARS.toLocaleString("pt-BR")} caracteres para extrair o perfil.
              </p>
            )}

            {extractError && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {extractError}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Profile Preview — só renderiza se existir um perfil válido */}
      {extracted && profile && isValidProfile(profile) && (
        <section className="rounded-2xl border border-teal/20 bg-gradient-to-br from-slate-900 to-teal/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-teal" />
            <h2 className="font-heading font-semibold">Perfil Extraído</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[{ label: "Nome", value: profile.name }, { label: "Email", value: profile.email }, { label: "Localização", value: profile.location }, { label: "Idiomas", value: profile.languages?.join(", ") }].map(({ label, value }) => (
              <div key={label}>
                <p className="text-sm text-silver">{label}</p>
                <p className="font-medium">{value || "—"}</p>
              </div>
            ))}
          </div>
          {Array.isArray(profile.skills?.primary) && profile.skills.primary.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-silver">Habilidades Principais</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.primary.map((s: string, i: number) => (
                  <span key={i} className="rounded-full bg-teal/15 px-3 py-1 text-xs text-teal">{s}</span>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(profile.skills?.secondary) && profile.skills.secondary.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-silver">Habilidades Secundárias</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.secondary.map((s: string, i: number) => (
                  <span key={i} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-silver">{s}</span>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(profile.experience) && profile.experience.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-silver">Experiência</p>
              <ul className="space-y-2">
                {profile.experience.map((exp: any, i: number) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-cloud">{exp.title}</span>
                    {exp.company ? <span className="text-silver"> — {exp.company}</span> : null}
                    {exp.period ? <span className="text-slate-500"> · {exp.period}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(profile.education) && profile.education.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-silver">Educação</p>
              <ul className="space-y-2">
                {profile.education.map((edu: any, i: number) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-cloud">{edu.degree}</span>
                    {edu.field ? <span className="text-silver"> em {edu.field}</span> : null}
                    {edu.institution ? <span className="text-slate-500"> — {edu.institution}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </>
  )
}
