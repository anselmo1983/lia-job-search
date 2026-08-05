import { redirect } from "next/navigation"

import { AppShell } from "@/components/app-shell"
import { getServerSession } from "@/lib/auth/server"

/**
 * CT224 — Layout do grupo protegido.
 *
 * Barreira real de segurança (além do middleware cookie-gate): qualquer página
 * protegida valida a sessão via Better Auth e redireciona para /login se ausente.
 * O AppShell (sidebar) fica aqui — /login renderiza sem o shell.
 */
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session) {
    redirect("/login")
  }

  return <AppShell>{children}</AppShell>
}
