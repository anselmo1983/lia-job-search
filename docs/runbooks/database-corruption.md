# Runbook — Corrupção do Banco de Dados SQLite

## Sintoma
Erros `SQLITE_CORRUPT` ou falhas de leitura em rotas de API.

## Ações
1. Parar a aplicação: `docker compose down`.
2. Renomear o banco corrompido para análise posterior.
3. Executar a restauração do backup mais recente usando `tools/restore.sh`.
4. Iniciar a aplicação: `docker compose up -d`.
