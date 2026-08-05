# Integração Cloudflare Tunnel & Access

## Visão Geral
A aplicação CT223 não expõe portas públicas diretamente para a internet. O tráfego flui exclusivamente via Cloudflare Tunnel e é protegido pelo Cloudflare Access.

## Configuração do Cloudflare Access
- **Aplicação**: Lia Job Search
- **Decisão**: Allow
- **Regra de Acesso**: Permitir apenas o e-mail cadastrado na allowlist
- **Origem Protegida**: Requisições tratadas pelo proxy local CT100 / Tunnel.
