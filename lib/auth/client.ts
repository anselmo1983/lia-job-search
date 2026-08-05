"use client"

import { createAuthClient } from "better-auth/react"
import { AUTH_BASE_PATH } from "@/lib/auth/config"

/**
 * CT224 — Cliente de autenticação (Better Auth) para componentes client.
 *
 * Não importar de Server Components. Para leitura de sessão no server,
 * use `getServerSession` de `@/lib/auth/server`.
 */
export const authClient = createAuthClient({
  basePath: AUTH_BASE_PATH,
})

export const { useSession, signIn, signUp, signOut } = authClient
