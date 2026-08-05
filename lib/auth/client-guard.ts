"use client"

/**
 * CT224 — Guard de fetch para componentes client.
 *
 * Envolve fetch() e, quando a sessão expira no meio de uma interação (resposta
 * 401 das APIs protegidas), redireciona para /login. O middleware já cobre o
 * carregamento de página; este guard dá o mesmo UX para chamadas client-side.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers || {}),
    },
  })

  if (res.status === 401) {
    // Sessão expirada/inválida — volta ao login preservando a intenção.
    if (typeof window !== "undefined") {
      window.location.assign(
        `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      )
    }
  }

  return res
}
