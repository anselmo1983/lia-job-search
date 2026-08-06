"use client"

import React, { useState } from "react"
import {
  LayoutDashboard,
  Server,
  ShieldCheck,
  FileText,
  Settings,
  LucideIcon,
} from "lucide-react"

export interface SidebarMenuItem {
  id: string
  label: string
  icon: LucideIcon
  href: string
  isBottom?: boolean
}

const MENU_ITEMS: SidebarMenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "#dashboard" },
  { id: "infraestrutura", label: "Infraestrutura", icon: Server, href: "#infraestrutura" },
  { id: "seguranca", label: "Segurança", icon: ShieldCheck, href: "#seguranca" },
  { id: "logs", label: "Logs", icon: FileText, href: "#logs" },
  { id: "configuracoes", label: "Configurações", icon: Settings, href: "#configuracoes", isBottom: true },
]

export function CanonicalSidebar({
  activeId = "dashboard",
  onSelect,
}: {
  activeId?: string
  onSelect?: (id: string) => void
}) {
  const [currentActive, setCurrentActive] = useState(activeId)

  const handleItemClick = (id: string) => {
    setCurrentActive(id)
    if (onSelect) onSelect(id)
  }

  const mainItems = MENU_ITEMS.filter((item) => !item.isBottom)
  const bottomItems = MENU_ITEMS.filter((item) => item.isBottom)

  return (
    <aside
      className="relative flex h-screen w-64 flex-col select-none border-r border-white/5 bg-[#2C3033] text-white"
      style={{
        boxShadow:
          "inset 1px 1px 0px rgba(255, 255, 255, 0.08), 4px 0px 12px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* 1. Header da Marca (Topo) */}
      <div className="flex h-20 items-center px-6">
        <div className="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-[#41787C] font-heading font-bold text-white shadow-md transition-transform duration-150 ease-out active:scale-95">
          <span className="text-base tracking-tight">Li^</span>
          <div className="absolute inset-0 rounded-xl border border-white/20" />
        </div>
      </div>

      {/* 2. Navegação Principal */}
      <nav className="flex flex-1 flex-col gap-2 p-3">
        {mainItems.map((item) => {
          const isActive = currentActive === item.id
          const IconComponent = item.icon

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`group relative flex w-full items-center gap-3.5 rounded-lg py-3 pl-4 pr-3 text-left text-sm transition-all duration-150 ease-out active:scale-[0.98] active:duration-50 ${
                isActive
                  ? "bg-transparent font-medium text-white"
                  : "bg-transparent font-normal text-white/85 hover:bg-white/[0.05]"
              }`}
            >
              {/* Marcador Visual Ativo (Linha vertical Teal 3px) */}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#41787C]" />
              )}

              {/* Ícone Line Art (strokeWidth={1.5}) */}
              <IconComponent
                size={20}
                strokeWidth={1.5}
                className={`shrink-0 transition-colors duration-150 ease-out ${
                  isActive
                    ? "text-[#41787C]"
                    : "text-white/85 group-hover:text-[#41787C]"
                }`}
              />

              {/* Texto do Menu */}
              <span
                className={`truncate transition-colors duration-150 ease-out ${
                  isActive ? "text-white" : "text-white/85 group-hover:text-white"
                }`}
              >
                {item.label}
              </span>
            </button>
          )
        })}

        {/* 3. Item Fixo na Base (Configurações) */}
        <div className="mt-auto pt-2">
          {bottomItems.map((item) => {
            const isActive = currentActive === item.id
            const IconComponent = item.icon

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`group relative flex w-full items-center gap-3.5 rounded-lg py-3 pl-4 pr-3 text-left text-sm transition-all duration-150 ease-out active:scale-[0.98] active:duration-50 ${
                  isActive
                    ? "bg-transparent font-medium text-white"
                    : "bg-transparent font-normal text-white/85 hover:bg-white/[0.05]"
                }`}
              >
                {/* Marcador Visual Ativo (Linha vertical Teal 3px) */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#41787C]" />
                )}

                {/* Ícone Line Art (strokeWidth={1.5}) */}
                <IconComponent
                  size={20}
                  strokeWidth={1.5}
                  className={`shrink-0 transition-colors duration-150 ease-out ${
                    isActive
                      ? "text-[#41787C]"
                      : "text-white/85 group-hover:text-[#41787C]"
                  }`}
                />

                {/* Texto do Menu */}
                <span
                  className={`truncate transition-colors duration-150 ease-out ${
                    isActive ? "text-white" : "text-white/85 group-hover:text-white"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
