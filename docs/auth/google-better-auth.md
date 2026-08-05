# Autenticação Lia Job Search — Better Auth + Google OAuth (LJS_GOOGLE_AUTH_V1)

## 1. Arquitetura

O Lia Job Search (LJS) utiliza o **Better Auth** como autoridade única e centralizada de autenticação e sessão.

```
Browser
  ↓
/login (Página pública)
  ↓
[ Continuar com Google ]  (authClient.signIn.social({ provider: "google" }))
  ↓
Google OAuth 2.0 / OIDC
  ↓
Better Auth Callback (/api/auth/callback/google)
  ↓
Validação de identidade Google + Validação Server-Side de Allowlist (LJS_AUTH_ALLOWED_EMAILS)
  ↓
Criação/Atualização da Sessão em SQLite (<LIA_DATA_DIR>/auth/auth.db)
  ↓
Redirecionamento para área protegida (/)
```

### Separação entre Autenticação e Autorização:
- **Autenticação**: "Quem é o usuário?" (Validado via Google OAuth / OIDC).
- **Autorização**: "Este usuário tem permissão para acessar o LJS?" (Validado server-side via `LJS_AUTH_ALLOWED_EMAILS`).

---

## 2. Variáveis de Ambiente

As seguintes variáveis de ambiente configuram a autenticação em produção e desenvolvimento:

```bash
# URL Canônica do Deployment
BETTER_AUTH_URL=https://lia-job-search.tail050f5c.ts.net

# Secret de Sessão (mínimo 32 caracteres de alta entropia, ex.: openssl rand -base64 32)
BETTER_AUTH_SECRET=seu_secret_gerado_aqui

# Credenciais Google OAuth 2.0 Client
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret

# Allowlist de E-mails Autorizados (separados por vírgula, sem espaços, case-insensitive)
LJS_AUTH_ALLOWED_EMAILS=seu_email@gmail.com
```

> **IMPORTANTE**: Nunca comite valores reais em repositórios nem exponha segredos no bundle do navegador.

---

## 3. Configuração no Google Cloud Console

1. Acesse o **Google Cloud Console** -> **APIs & Services** -> **Credentials**.
2. Clique em **Create Credentials** -> **OAuth client ID**.
3. Selecione **Application type**: `Web application`.
4. Nomeie como `Lia Job Search Production`.
5. Em **Authorized JavaScript origins**:
   - `https://lia-job-search.tail050f5c.ts.net` (Tailscale prod)
   - `http://ljs.home` (LAN, se aplicável)
   - `http://localhost:3000` (Dev local)
6. Em **Authorized redirect URIs**:
   - `https://lia-job-search.tail050f5c.ts.net/api/auth/callback/google`
   - `http://ljs.home/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
7. Salve e obtenha o `Client ID` e `Client Secret`.

---

## 4. Fluxo de Login, Allowlist e Sessão

### Scopes Solicitados no Login:
Neste gate (`LJS_GOOGLE_AUTH_V1`), são solicitados **apenas** os escopos básicos de identidade:
- `openid`
- `profile`
- `email`

Nenhum escopo de leitura ou envio de Gmail é solicitado no login.

### Allowlist Server-Side:
No hook `databaseHooks.user.create.before` do Better Auth (`lib/auth/server.ts`), o e-mail retornado pelo Google é verificado contra `LJS_AUTH_ALLOWED_EMAILS`. Se o e-mail não estiver na allowlist:
- A criação do usuário e da sessão é recusada no servidor.
- O usuário é redirecionado para a página de login com a mensagem de `ACCESS_DENIED`.

### Sessão Persistente & Logout:
- A sessão possui validade de 30 dias com renovação deslizante (sliding update após 24 horas de inatividade).
- Persistida no SQLite em `<LIA_DATA_DIR>/auth/auth.db`.
- Logout pode ser realizado chamando `authClient.signOut()`, o que invalida o token no banco de dados e remove o cookie de sessão.

---

## 5. Proteção de Rotas (Defesa em Profundidade)

1. **Camada 1 — Edge Cookie-Gate (`middleware.ts`)**:
   Verifica a existência do cookie `better-auth.session_token`. Se ausente, redireciona para `/login?next=<rota_solicitada>`.
2. **Camada 2 — Server Layout Protection (`app/(protected)/layout.tsx`)**:
   Chama `getServerSession()` para validar a assinatura e expiração do token no SQLite do servidor.
3. **Camada 3 — API Protection (`requireSession()` em `lib/auth/server.ts`)**:
   Retorna `401 Unauthorized` em chamadas diretas de API sem sessão válida.

---

## 6. Gestão de Usuários Autorizados

### Como Adicionar um Usuário Autorizado:
1. Adicione o e-mail do usuário à variável `LJS_AUTH_ALLOWED_EMAILS` no arquivo de ambiente do deployment (`/opt/lia-job-search/runtime.env`).
2. Reinicie o serviço LJS.

### Como Revogar o Acesso de um Usuário:
1. Remova o e-mail de `LJS_AUTH_ALLOWED_EMAILS`.
2. Opcionalmente, remova a sessão e o usuário do banco SQLite (`auth.db`) ou aguarde a expiração.

---

## 7. Preparação para Futura Integração Gmail (`LJS_GMAIL_CONNECT_V1`)

No gate futuro do Gmail:
- O login continuará sendo simples com escopos básicos.
- O acesso ao Gmail será solicitado de forma **incremental** nas configurações da aplicação (Settings -> Conectar Gmail).
- Serão solicitados os escopos específicos de e-mail e o `accessType: "offline"` para obtenção de `refresh_token`.

---

## 8. Troubleshooting & Rollback

### Problemas Frequentes:
- **`redirect_uri_mismatch`**: Verifique se a URL em `BETTER_AUTH_URL` bate exatamente com a URI cadastrada no Google Cloud Console.
- **`ACCESS_DENIED`**: Certifique-se de que o e-mail do Google utilizado está na variável `LJS_AUTH_ALLOWED_EMAILS`.

### Rollback:
Caso seja necessário reverter este gate:
```bash
git checkout 7398d0038f7d2521f2ec9afd53d705230392cc00
```
