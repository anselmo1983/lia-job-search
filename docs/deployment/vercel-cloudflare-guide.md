# Guia de Deployment: Vercel CLI, Telemetria & Cloudflare Domains

Este documento orienta como realizar o deploy do **Lia Job Search (LJS)** utilizando a **Vercel CLI**, ativar recursos de monitoramento no Free Tier e integrar domínios customizados gerenciados pela **Cloudflare**.

---

## 1. Deploy via Vercel CLI

O repositório já está vinculado ao projeto Vercel (`lia-job-search`).

### Comandos Principais da Vercel CLI:

```bash
# 1. Login no Vercel (se necessário)
npx vercel login

# 2. Preview Build / Deploy de teste
npx vercel

# 3. Production Deploy
npx vercel --prod
```

### Gestão de Variáveis de Ambiente na Vercel:

Para configurar as variáveis de ambiente necessárias para o Better Auth e Google OAuth no ambiente Vercel:

```bash
# Adicionar variável ao projeto Vercel
npx vercel env add BETTER_AUTH_SECRET production
npx vercel env add BETTER_AUTH_URL production
npx vercel env add GOOGLE_CLIENT_ID production
npx vercel env add GOOGLE_CLIENT_SECRET production
npx vercel env add LJS_AUTH_ALLOWED_EMAILS production

# Puxar variáveis de ambiente locais para desenvolvimento
npx vercel env pull .env.local
```

---

## 2. Telemetria e Logs no Free Tier (Vercel)

### Recursos Habilitados Automaticamente:

1. **Vercel Web Analytics (`@vercel/analytics`)**:
   - Integrado ao `RootLayout` (`app/layout.tsx`).
   - Monitora contagem de páginas visitadas, navegadores e origens.
   - **Free Tier**: 2.500 eventos por mês sem custo.

2. **Vercel Speed Insights (`@vercel/speed-insights`)**:
   - Integrado ao `RootLayout`.
   - Coleta métricas reais de **Core Web Vitals**: INP (Interaction to Next Paint), LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift) e FID.
   - **Free Tier**: 2.500 pontos de dados por mês.

3. **Function Logs & Structured Logging (`lib/logging.ts`)**:
   - O LJS emite logs estruturados em formato JSON em server-side API routes.
   - Os logs podem ser visualizados em tempo real no dashboard da Vercel (`Vercel Dashboard -> Project -> Logs`).

---

## 3. Integração de Domínio Customizado com Cloudflare

Se você possui um domínio próprio gerenciado na **Cloudflare** (ex.: `seu-dominio.com` ou `ljs.seu-dominio.com`), siga os passos para conectar à Vercel com máxima segurança:

### Passo 1: Adicionar o Domínio no Vercel Dashboard / CLI

```bash
npx vercel domains add ljs.seu-dominio.com
```

### Passo 2: Configurar os Registros DNS na Cloudflare

No painel da Cloudflare (`DNS -> Records`), adicione o registro correspondente:

* **Para Subdomínio (ex.: `ljs.seu-dominio.com`)**:
  - **Type**: `CNAME`
  - **Name**: `ljs`
  - **Target**: `cname.vercel-dns.com`
  - **Proxy status**: `Proxied` (Nuvem Laranja 🟠)

* **Para Domínio Apex (ex.: `seu-dominio.com`)**:
  - **Type**: `A`
  - **Name**: `@`
  - **Target**: `76.76.21.21`
  - **Proxy status**: `Proxied` (Nuvem Laranja 🟠)

### Passo 3: Configuração do SSL/TLS na Cloudflare (**MUITO IMPORTANTE**)

Para evitar *redirect loops* (erro `ERR_TOO_MANY_REDIRECTS`) entre o Cloudflare Proxy e os certificados automáticos Let's Encrypt da Vercel:

1. Vá em **Cloudflare Dashboard** -> **SSL/TLS**.
2. Altere o modo de criptografia SSL/TLS para: **Full (strict)**.
3. Certifique-se de que **Always Use HTTPS** está ativado na aba **Edge Certificates**.

---

## 4. Arquitetura Híbrida: Vercel + PVE Container (CT223)

| Componente | Vercel (Edge / Serverless) | CT223 Container (PVE Host) |
| :--- | :--- | :--- |
| **Finalidade** | Interface web pública / CDN / Frontend Edge | Runtime canônico / Docker / SQLite persistente |
| **Banco de Dados** | SQLite epêmero em `/tmp` | SQLite montado em `/app/data/auth/auth.db` |
| **Sessão & Auth** | Better Auth com Google OAuth | Better Auth com Google OAuth |
| **URL Canônica** | `https://lia-job-search.vercel.app` | `https://lia-job-search.tail050f5c.ts.net` |
