"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Server,
  ShieldCheck,
  FileText,
  Settings,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth/client"

const canonicalNavigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/infra", label: "Infraestrutura", icon: Server },
  { href: "/security", label: "Segurança", icon: ShieldCheck },
  { href: "/logs", label: "Logs", icon: FileText },
]

const bottomNavigation = [
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
    <div className="min-h-screen bg-[#0E1418] text-white antialiased font-sans">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-[#41787C] px-4 py-2 font-semibold text-white transition focus:translate-y-0 shadow-lg"
      >
        Ir para o conteúdo principal
      </a>

      {/* 
        CANONICAL LIA OS SIDEBAR:
        - Base: Gunmetal #2C3033
        - Accent/Active: Teal #41787C
        - Tactile Inset Shadow: inset 1px 1px 0px rgba(255,255,255,0.08)
        - Depth Shadow: 4px 0px 12px rgba(0,0,0,0.4)
      */}
      <aside
        className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col select-none border-r border-white/5 bg-[#2C3033] text-white transition-all duration-200 ease-out"
        style={{
          boxShadow:
            "inset 1px 1px 0px rgba(255, 255, 255, 0.08), 4px 0px 12px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* 1. Header da Marca (Topo) - Estritamente apenas o símbolo do escudo, sem texto 'Lia OS' */}
        <div className="flex h-20 items-center px-6">
          <div className="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-[#41787C] font-heading font-bold text-white shadow-md transition-transform duration-150 ease-out active:scale-95">
            <span className="text-base tracking-tight select-none">Li^</span>
            <div className="absolute inset-0 rounded-xl border border-white/20" />
          </div>
        </div>

        {/* 2. Menus de Navegação (Espaçamento generoso múltiplos de 8px) */}
        <nav className="flex flex-1 flex-col gap-2 p-3 overflow-y-auto">
          {canonicalNavigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center gap-3.5 rounded-lg py-3 pl-4 pr-3 text-left text-sm transition-all duration-150 ease-out active:scale-[0.98] active:duration-50",
                  active
                    ? "bg-transparent font-medium text-white"
                    : "bg-transparent font-normal text-white/85 hover:bg-white/[0.05]"
                )}
              >
                {/* Marcador Visual Ativo (Linha vertical Teal 3px na extremidade esquerda) */}
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#41787C]" />
                )}

                {/* Ícone Line Art (Stroke exact 1.5px) */}
                <Icon
                  size={20}
                  strokeWidth={1.5}
                  className={cn(
                    "shrink-0 transition-colors duration-150 ease-out",
                    active
                      ? "text-[#41787C]"
                      : "text-white/85 group-hover:text-[#41787C]"
                  )}
                />

                {/* Texto do Item */}
                <span
                  className={cn(
                    "truncate transition-colors duration-150 ease-out",
                    active ? "text-white" : "text-white/85 group-hover:text-white"
                  )}
                >
                  {label}
                </span>
              </Link>
            )
          })}

          {/* Configurações Afastado dos demais (Fixo na Base da Sidebar) */}
          <div className="mt-auto pt-2 space-y-2">
            {bottomNavigation.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group relative flex items-center gap-3.5 rounded-lg py-3 pl-4 pr-3 text-left text-sm transition-all duration-150 ease-out active:scale-[0.98] active:duration-50",
                    active
                      ? "bg-transparent font-medium text-white"
                      : "bg-transparent font-normal text-white/85 hover:bg-white/[0.05]"
                  )}
                >
                  {/* Marcador Visual Ativo */}
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#41787C]" />
                  )}

                  {/* Ícone Line Art (Stroke exact 1.5px) */}
                  <Icon
                    size={20}
                    strokeWidth={1.5}
                    className={cn(
                      "shrink-0 transition-colors duration-150 ease-out",
                      active
                        ? "text-[#41787C]"
                        : "text-white/85 group-hover:text-[#41787C]"
                    )}
                  />

                  {/* Texto do Item */}
                  <span
                    className={cn(
                      "truncate transition-colors duration-150 ease-out",
                      active ? "text-white" : "text-white/85 group-hover:text-white"
                    )}
                  >
                    {label}
                  </span>
                </Link>
              )
            })}

            {/* Rodapé de Sessão / Logout */}
            <div className="mt-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2 border border-white/5">
                <div className="min-w-0">
                  <p
                    className="truncate text-xs font-medium text-white/85"
                    title={session?.user?.email || "Sessão"}
                  >
                    {isPending ? "…" : session?.user?.email || "Operador"}
                  </p>
                  <p className="text-[10px] text-white/50">Lia OS Enterprise</p>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sair da sessão"
                  className="shrink-0 rounded-md p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
                >
                  <LogOut size={16} strokeWidth={1.5} className="text-white/50 hover:text-red-400" />
                </button>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Area offset by Sidebar width */}
      <main id="main-content" tabIndex={-1} className="pl-64 min-h-screen">
        <div className="mx-auto max-w-7xl p-6 sm:p-8">{children}</div>
      </main>
    </div>
  )
}

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#41787C] font-heading">
        Lia OS Enterprise
      </p>
      <h1 className="font-heading text-3xl font-bold tracking-[-0.018em] sm:text-4xl text-white">
        {title}
      </h1>
      <p className="mt-2 max-w-3xl text-white/70">{description}</p>
    </header>
  )
}

export function EmptyState({ title, description, command }: { title: string; description: string; command: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-[#1C262C]/50 p-8 text-center">
      <h2 className="font-heading font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">{description}</p>
      <code className="mt-4 inline-block rounded-lg bg-[#0E1418] px-4 py-2 text-sm text-[#41787C] font-mono border border-white/5">
        {command}
      </code>
    </div>
  )
}
