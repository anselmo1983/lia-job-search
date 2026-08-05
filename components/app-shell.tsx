"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, BriefcaseBusiness, CalendarDays, FileText, LayoutDashboard, ListTodo, LogOut, Package, Settings, Sparkles, Users, Workflow } from "lucide-react"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth/client"

const navigation = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/fill-ups", label: "Fill-Ups (IA)", icon: Sparkles },
  { href: "/jobs", label: "Vagas & Scraper", icon: BriefcaseBusiness },
  { href: "/batch", label: "Processamento em Lote", icon: Package },
  { href: "/applications", label: "Candidaturas", icon: FileText },
  { href: "/network", label: "Rede de Contatos", icon: Users },
  { href: "/tasks", label: "Tarefas & Agente", icon: ListTodo },
  { href: "/resumes", label: "Currículos & Cartas", icon: FileText },
  { href: "/statistics", label: "Estatísticas & Métricas", icon: BarChart3 },
  { href: "/calendar", label: "Entrevistas & STAR", icon: CalendarDays },
  { href: "/workflows", label: "Fluxos de Trabalho", icon: Workflow },
  { href: "/settings", label: "Configurações", icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-[#0E1418] text-[#F2F4F3]">
      <a href="#main-content" className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-slate-950 transition focus:translate-y-0">
        Ir para o conteúdo principal
      </a>
      <aside className="border-b border-[#3D474D]/40 bg-[#0A1014] lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r lg:border-[#3D474D]/40">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-[#3D474D]/40 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400 font-heading font-bold text-[#0E1418] text-lg">Li^</div>
          <div>
            <p className="font-heading font-semibold text-[#D0D1CF]">Lia OS</p>
            <p className="text-xs text-[#A6AEB2]">Busca de Vagas por IA</p>
          </div>
        </div>
        {/* Navigation */}
        <nav className="flex gap-2 overflow-x-auto p-3 lg:block lg:max-h-[calc(100vh-4rem)] lg:space-y-1 lg:overflow-y-auto">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition font-medium",
                  active
                    ? "bg-emerald-400 text-slate-950 font-semibold shadow-sm"
                    : "text-[#A6AEB2] hover:bg-[#1C262C] hover:text-[#D0D1CF]"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>
        {/* Session footer */}
        <div className="hidden border-t border-[#3D474D]/40 p-3 lg:block">
          <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[#D0D1CF]">
                {isPending ? "…" : (session?.user?.email || "Sessão")}
              </p>
              <p className="text-[10px] text-[#6B7478]">Proprietário</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sair"
              className="shrink-0 rounded-md p-1.5 text-[#A6AEB2] transition hover:bg-[#1C262C] hover:text-[#F2F4F3]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className="lg:pl-64">
        <div className="mx-auto max-w-7xl p-5 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400 font-heading">Lia Workspace</p>
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl text-[#D0D1CF]">{title}</h1>
      <p className="mt-2 max-w-3xl text-[#A6AEB2]">{description}</p>
    </header>
  )
}

export function EmptyState({ title, description, command }: { title: string; description: string; command: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#3D474D] bg-[#1C262C]/50 p-8 text-center">
      <h2 className="font-heading font-semibold text-[#D0D1CF]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[#A6AEB2]">{description}</p>
      <code className="mt-4 inline-block rounded-lg bg-[#0E1418] px-4 py-2 text-sm text-emerald-400 font-mono">{command}</code>
    </div>
  )
}
