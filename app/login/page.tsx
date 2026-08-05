import Link from "next/link"
import { redirect } from "next/navigation"

import { hasGoogleOAuthCredentials } from "@/lib/auth/config"
import { getServerSession } from "@/lib/auth/server"
import { LoginButton } from "@/app/login/login-button"

export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const session = await getServerSession()
  if (session) {
    redirect("/")
  }

  const { next, error } = await searchParams
  const callbackURL = typeof next === "string" && next.startsWith("/") ? next : "/"
  const oauthConfigured = hasGoogleOAuthCredentials()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0E1418] p-6 text-[#F2F4F3]">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-400 text-lg font-bold text-[#0E1418]">
            Li^
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#D0D1CF]">Lia Job Search</h1>
          <p className="mt-1 text-sm text-[#A6AEB2]">Entre para continuar</p>
        </div>

        <div className="rounded-2xl border border-[#3D474D]/40 bg-[#0A1014] p-6">
          <h2 className="text-lg font-semibold text-[#D0D1CF]">Autenticação</h2>
          <p className="mt-1 text-xs text-[#A6AEB2]">
            Acesso restrito ao proprietário. Autentique-se via Google para continuar.
          </p>

          <div className="mt-6">
            <LoginButton
              callbackURL={callbackURL}
              initialError={error}
              oauthConfigured={oauthConfigured}
            />
          </div>

          <p className="mt-6 text-center text-xs text-[#6B7478]">
            Sessão protegida · Single-user · Allowlist server-side
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#6B7478]">
          <Link href="/api/health" className="underline decoration-[#3D474D] hover:text-[#A6AEB2]">
            Health check
          </Link>
        </p>
      </div>
    </div>
  )
}
