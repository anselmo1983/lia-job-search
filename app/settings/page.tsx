"use client"

import { useState, useEffect, FormEvent } from "react"
import { Key, Upload, User, Save, Check, Loader2, Eye, EyeOff, Shield, Lock } from "lucide-react"
import { PageHeader } from "@/components/app-shell"
import { Button } from "@/components/ui/button"

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-teal font-mono"

export default function SettingsPage() {
  const [apiProvider, setApiProvider] = useState<string>("openai")
  const [apiModel, setApiModel] = useState<string>("gpt-4o-mini")
  const [apiKey, setApiKey] = useState("")
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [profileText, setProfileText] = useState("")
  const [keyExists, setKeyExists] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("lia-api-key") || ""
    setApiKey(stored)
    setKeyExists(stored.length > 0)
    setApiProvider(localStorage.getItem("lia-api-provider") || "openai")
    setApiModel(localStorage.getItem("lia-api-model") || "gpt-4o-mini")
  }, [])

  const modelsByProvider: Record<string, {value:string, label:string}[]> = {
    openai: [
      { value: "gpt-4o-mini", label: "GPT-4o-mini (rápido, custo baixo)" },
      { value: "gpt-4o", label: "GPT-4o (máxima qualidade)" },
    ],
    anthropic: [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (balanceado)" },
      { value: "claude-opus-4-20250514", label: "Claude Opus 4 (máxima qualidade)" },
    ],
    kimi: [
      { value: "kimi-k3", label: "Kimi K3 (2.8T params, reasoning)" },
      { value: "kimi-k2.7-code", label: "Kimi K2.7 Code (coding, ~180 tok/s)" },
      { value: "kimi-k2.6", label: "Kimi K2.6 (256K context, baixo custo)" },
    ],
  }

  function saveApiKey() {
    localStorage.setItem("lia-api-key", apiKey)
    localStorage.setItem("lia-api-provider", apiProvider)
    localStorage.setItem("lia-api-model", apiModel)
    setKeyExists(apiKey.length > 0)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function clearKey() {
    setApiKey("")
    localStorage.removeItem("lia-api-key")
    setKeyExists(false)
  }

  function handleProviderChange(newProvider: string) {
    setApiProvider(newProvider)
    const models = modelsByProvider[newProvider] || []
    setApiModel(models[0]?.value || "")
  }

  function maskKey(key: string): string {
    if (key.length <= 8) return key
    return key.substring(0, 4) + "•".repeat(Math.min(key.length - 8, 20)) + key.substring(key.length - 4)
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
        setUploadResult(`✅ ${data.fileName} — texto extraído com sucesso`)
        setProfileText(data.extractedText || "")
      } else {
        setUploadResult(`❌ ${data.error}`)
      }
    } catch {
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
      <PageHeader title="Configurações" description="Gerencie suas chaves de API de forma segura e faça upload do currículo." />

      {/* Security Notice */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-teal/20 bg-teal/5 p-4">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
        <div>
          <p className="font-heading font-semibold text-sm text-cloud">Suas chaves estão seguras</p>
          <p className="mt-1 text-xs text-silver">
            A API key fica armazenada apenas no <strong>localStorage do seu navegador</strong> (mesmo modelo de segurança do GitHub, Vercel e OpenAI). 
            Ela é enviada diretamente do seu navegador para o provedor de IA — <strong>nunca armazenamos no servidor</strong>. 
            O currículo enviado é processado em memória e descartado após a extração.
          </p>
        </div>
      </div>

      {/* API Key */}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-teal" />
            <h2 className="font-heading font-semibold">Chave de API</h2>
          </div>
          {keyExists && (
            <span className="flex items-center gap-1.5 rounded-full bg-teal/15 px-3 py-1 text-xs text-teal">
              <Check className="h-3 w-3" /> Configurada
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select className={inputClass} value={apiProvider} onChange={e => handleProviderChange(e.target.value)}>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="kimi">Kimi (Moonshot AI)</option>
          </select>
          <select className={inputClass} value={apiModel} onChange={e => setApiModel(e.target.value)}>
            {(modelsByProvider[apiProvider] || []).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              className={`${inputClass} w-full pr-10`}
              type={showKey ? "text" : "password"}
              placeholder={apiProvider === "kimi" ? "sk-... (Moonshot API Key)" : "sk-..."}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-silver hover:text-cloud"
              tabIndex={-1}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveApiKey}>
              {saved ? <><Check className="h-4 w-4" /> Salvo</> : <><Save className="h-4 w-4" /> Salvar</>}
            </Button>
            {keyExists && (
              <Button variant="destructive" onClick={clearKey}>
                Remover
              </Button>
            )}
          </div>
        </div>

        {keyExists && !showKey && (
          <p className="mt-3 text-xs text-silver font-mono">
            {maskKey(apiKey)} <span className="text-slate-600">— clique 👁️ para revelar</span>
          </p>
        )}
      </section>

      {/* Upload CV */}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="h-5 w-5 text-teal" />
          <h2 className="font-heading font-semibold">Upload de Currículo</h2>
        </div>
        <p className="mb-4 text-sm text-silver">Envie seu PDF ou TXT. O texto é extraído no servidor e descartado após a extração. Nunca armazenamos seu currículo.</p>
        <form onSubmit={handleUpload} className="flex flex-col gap-3 sm:flex-row">
          <input className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-teal/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-teal hover:file:bg-teal/20" type="file" accept=".pdf,.txt" />
          <Button type="submit" disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
        </form>
        {uploadResult && <p className="mt-3 text-sm">{uploadResult}</p>}
        {profileText && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-silver">Texto extraído ({profileText.length} caracteres). Pronto para extrair perfil.</p>
            <Button onClick={extractProfile} disabled={extracting || !apiKey}>
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
              {extracting ? "Extraindo..." : "Extrair Perfil Automaticamente"}
            </Button>
          </div>
        )}
      </section>

      {/* Profile Preview */}
      {profile && (
        <section className="rounded-2xl border border-teal/20 bg-gradient-to-br from-slate-900 to-teal/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-teal" />
            <h2 className="font-heading font-semibold">Perfil Extraído</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[{ label: "Nome", value: profile.name }, { label: "Email", value: profile.email }, { label: "Localização", value: profile.location }, { label: "Idiomas", value: profile.languages }].map(({ label, value }) => (
              <div key={label}>
                <p className="text-sm text-silver">{label}</p>
                <p className="font-medium">{value || "—"}</p>
              </div>
            ))}
          </div>
          {profile.skills?.primary?.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-silver">Habilidades Principais</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.primary.map((s: string, i: number) => (
                  <span key={i} className="rounded-full bg-teal/15 px-3 py-1 text-xs text-teal">{s}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  )
}
