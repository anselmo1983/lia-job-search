"use client"

import { useState, useEffect, FormEvent } from "react"
import { Key, Upload, User, Save, Check, AlertCircle, Loader2 } from "lucide-react"
import { PageHeader } from "@/components/app-shell"
import { Button } from "@/components/ui/button"

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-400"

export default function SettingsPage() {
  const [apiProvider, setApiProvider] = useState<string>("openai")
  const [apiKey, setApiKey] = useState("")
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [profileText, setProfileText] = useState("")

  useEffect(() => {
    setApiKey(localStorage.getItem("lia-api-key") || "")
    setApiProvider(localStorage.getItem("lia-api-provider") || "openai")
  }, [])

  function saveApiKey() {
    localStorage.setItem("lia-api-key", apiKey)
    localStorage.setItem("lia-api-provider", apiProvider)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]')
    if (!fileInput?.files?.[0]) return

    setUploading(true)
    setUploadResult("")
    try {
      const fd = new FormData()
      fd.append("file", fileInput.files[0])
      const res = await fetch("/api/profile/upload-cv", { method: "POST", body: fd })
      const data = await res.json()
      if (data.success) {
        setUploadResult(`✅ ${data.fileName} salvo com sucesso!`)
        setProfileText(data.extractedText || "")
      } else {
        setUploadResult(`❌ ${data.error}`)
      }
    } catch (err) {
      setUploadResult("❌ Erro no upload")
    }
    setUploading(false)
  }

  async function extractProfile() {
    if (!profileText || !apiKey) return
    setExtracting(true)
    try {
      const res = await fetch("/api/profile/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: profileText, apiKey, provider: apiProvider }),
      })
      const data = await res.json()
      setProfile(data.profile)
    } catch (err) {
      console.error(err)
    }
    setExtracting(false)
  }

  return (
    <>
      <PageHeader title="Configurações" description="Configure suas chaves de API, faça upload do currículo e gerencie seu perfil." />

      {/* API Key */}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="h-5 w-5 text-emerald-400" />
          <h2 className="font-semibold">Chave de API</h2>
        </div>
        <p className="mb-4 text-sm text-slate-400">Necessária para avaliação de vagas, geração de currículos e cartas.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select className={inputClass} value={apiProvider} onChange={e => setApiProvider(e.target.value)}>
            <option value="openai">OpenAI (GPT-4o-mini)</option>
            <option value="anthropic">Anthropic (Claude Sonnet)</option>
          </select>
          <input className={`${inputClass} flex-1 font-mono`} type="password" placeholder="sk-..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
          <Button onClick={saveApiKey}>
            {saved ? <><Check className="h-4 w-4" /> Salvo</> : <><Save className="h-4 w-4" /> Salvar</>}
          </Button>
        </div>
      </section>

      {/* Upload CV */}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="h-5 w-5 text-emerald-400" />
          <h2 className="font-semibold">Upload de Currículo</h2>
        </div>
        <form onSubmit={handleUpload} className="flex flex-col gap-3 sm:flex-row">
          <input className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-400/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-300 hover:file:bg-emerald-400/20" type="file" accept=".pdf,.docx,.txt" />
          <Button disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
        </form>
        {uploadResult && <p className="mt-3 text-sm">{uploadResult}</p>}
        {profileText && (
          <div className="mt-4">
            <Button onClick={extractProfile} disabled={extracting}>
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
              Extrair Perfil Automaticamente
            </Button>
          </div>
        )}
      </section>

      {/* Profile Preview */}
      {profile && (
        <section className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-slate-900 to-emerald-950/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold">Perfil Extraído</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-400">Nome</p>
              <p className="font-medium">{profile.name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Email</p>
              <p className="font-medium">{profile.email || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Localização</p>
              <p className="font-medium">{profile.location || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Idiomas</p>
              <p className="font-medium">{profile.languages || "—"}</p>
            </div>
          </div>
          {profile.skills?.primary?.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-slate-400">Habilidades Principais</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.primary.map((s: string, i: number) => (
                  <span key={i} className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-300">{s}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  )
}
