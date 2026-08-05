# Runbook — Falha de Login

## Sintoma
Usuário recebe erro ao tentar autenticar via Google OAuth ou e-mail/senha.

## Passos de Diagnóstico
1. Verificar se o e-mail do usuário está incluído na variável `LJS_AUTH_ALLOWED_EMAILS` em `/opt/lia-job-search/runtime.env`.
2. Conferir os logs da aplicação: `docker logs -f lia-job-search`.
3. Verificar a permissão e existência da base SQLite em `<LIA_DATA_DIR>/database/lia.db`.
