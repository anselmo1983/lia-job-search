"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth/client"

const GoogleMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
    />
  </svg>
)

const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={`animate-spin ${className || ""}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

interface LoginButtonProps {
  callbackURL: string
  initialError?: string
  oauthConfigured?: boolean
}

export function LoginButton({
  callbackURL,
  initialError,
  oauthConfigured = true,
}: LoginButtonProps) {
  const [status, setStatus] = useState<
    | "idle"
    | "loading"
    | "oauth_redirect"
    | "access_denied"
    | "auth_error"
    | "missing_credentials"
  >(
    !oauthConfigured
      ? "missing_credentials"
      : initialError === "ACCESS_DENIED" || initialError === "access_denied"
        ? "access_denied"
        : initialError
          ? "auth_error"
          : "idle",
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(
    !oauthConfigured
      ? "GOOGLE_CLIENT_ID e/ou GOOGLE_CLIENT_SECRET não estão configurados no servidor."
      : initialError === "ACCESS_DENIED" || initialError === "access_denied"
        ? "Acesso negado: sua conta Google não está autorizada no LJS."
        : initialError
          ? "Ocorreu um erro durante a autenticação. Tente novamente."
          : null,
  )

  const handleGoogleSignIn = async () => {
    if (!oauthConfigured) {
      setStatus("missing_credentials")
      setErrorMessage("GOOGLE_CLIENT_ID e/ou GOOGLE_CLIENT_SECRET não estão configurados no servidor.")
      return
    }

    try {
      setStatus("loading")
      setErrorMessage(null)

      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      })

      const targetUrl =
        (res as { data?: { url?: string }; url?: string })?.data?.url ||
        (res as { url?: string })?.url

      if (targetUrl) {
        setStatus("oauth_redirect")
        window.location.href = targetUrl
        return
      }

      if (res?.error) {
        const msg = res.error.message || ""
        if (
          res.error.code === "ACCESS_DENIED" ||
          msg.includes("allowlist") ||
          msg.includes("not authorized")
        ) {
          setStatus("access_denied")
          setErrorMessage("Acesso negado: conta não autorizada.")
        } else if (
          msg.includes("missing clientId") ||
          msg.includes("missing clientSecret") ||
          msg.includes("Client Id and Client Secret is required")
        ) {
          setStatus("missing_credentials")
          setErrorMessage(
            "Credenciais OAuth não configuradas. O administrador deve definir GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no ambiente do servidor.",
          )
        } else {
          setStatus("auth_error")
          setErrorMessage(msg || "Falha na autenticação com o Google.")
        }
      } else {
        setStatus("oauth_redirect")
      }
    } catch (err: unknown) {
      setStatus("auth_error")
      const msg = err instanceof Error ? err.message : ""
      if (
        msg.includes("missing clientId") ||
        msg.includes("missing clientSecret") ||
        msg.includes("Client Id and Client Secret is required")
      ) {
        setStatus("missing_credentials")
        setErrorMessage(
          "Credenciais OAuth não configuradas. O administrador deve definir GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no ambiente do servidor.",
        )
      } else {
        setErrorMessage(msg || "Erro ao conectar com o serviço de autenticação.")
      }
    }
  }

  const missingCreds = status === "missing_credentials"

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div
          role="alert"
          className={`rounded-lg border p-3 text-xs ${
            missingCreds
              ? "border-amber-500/30 bg-amber-950/40 text-amber-300"
              : "border-red-500/30 bg-red-950/40 text-red-300"
          }`}
        >
          <p>{errorMessage}</p>
          {missingCreds && (
            <p className="mt-2 text-[10px] text-amber-400/70">
              Defina as variáveis de ambiente no Vercel Dashboard → Settings →
              Environment Variables e faça redeploy.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={
          status === "loading" ||
          status === "oauth_redirect" ||
          missingCreds
        }
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#3D474D]/40 bg-[#1C262C] px-4 py-3 text-sm font-medium text-[#D0D1CF] transition hover:bg-[#24323A] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
      >
        {status === "loading" || status === "oauth_redirect" ? (
          <>
            <Spinner className="h-5 w-5 text-emerald-400" />
            <span>
              {status === "oauth_redirect"
                ? "Redirecionando..."
                : "Conectando ao Google..."}
            </span>
          </>
        ) : (
          <>
            <GoogleMark className="h-5 w-5" />
            <span>Continuar com Google</span>
          </>
        )}
      </button>
    </div>
  )
}
