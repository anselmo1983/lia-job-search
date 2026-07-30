"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, BriefcaseBusiness, CalendarDays, FileText, LayoutDashboard, ListTodo, Sparkles, Users, Workflow } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/fill-ups", label: "AI Fill-Ups", icon: Sparkles },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/applications", label: "Applications", icon: FileText },
  { href: "/network", label: "Network", icon: Users },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/calendar", label: "Interviews", icon: CalendarDays },
  { href: "/workflows", label: "Workflows", icon: Workflow },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <a href="#main-content" className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-slate-950 transition focus:translate-y-0">Skip to main content</a>
      <aside className="border-b border-slate-800 bg-slate-900/80 lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400 font-bold text-slate-950">L</div>
          <div><p className="font-semibold">LIA Job Search</p><p className="text-xs text-slate-400">Workspace local</p></div>
        </div>
        <nav className="flex gap-2 overflow-x-auto p-3 lg:block lg:max-h-[calc(100vh-4rem)] lg:space-y-1 lg:overflow-y-auto">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href)
            return <Link key={href} href={href} className={cn("flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition", active ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white")}><Icon className="h-4 w-4" />{label}</Link>
          })}
        </nav>
      </aside>
      <main id="main-content" tabIndex={-1} className="lg:pl-64"><div className="mx-auto max-w-7xl p-5 sm:p-8">{children}</div></main>
    </div>
  )
}

export function PageHeader({ title, description }: { title: string; description: string }) {
  return <header className="mb-8"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">LIA Workspace</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 max-w-3xl text-slate-400">{description}</p></header>
}

export function EmptyState({ title, description, command }: { title: string; description: string; command: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center"><h2 className="font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">{description}</p><code className="mt-4 inline-block rounded-lg bg-slate-950 px-4 py-2 text-sm text-emerald-300">{command}</code></div>
}
