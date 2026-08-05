# Autenticação e Segurança (Better Auth)

## Visão Geral
A autenticação do CT223 é operada pelo **Better Auth** com persistência em SQLite.

## Fluxo de Login
1. **Google OAuth**: Autenticação OIDC via Google com verificação de e-mail autorizados via `LJS_AUTH_ALLOWED_EMAILS`.
2. **Email e Senha**: Provedor habilitado com cadastro desativado (`disableSignUp: true`) para o ambiente single-user.

## Camadas de Proteção
- **Middleware**: Guard no Edge verificando a presença do cookie `better-auth.session_token`.
- **Server Guard**: Função `requireSession()` validando a sessão no SQLite do servidor.
- **Isolamento de Credenciais**: Variaveis `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET` mantidas exclusivas no arquivo `runtime.env` (0600).
