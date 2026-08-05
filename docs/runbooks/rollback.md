# Runbook — Rollback de Release

## Procedimento
1. Obter a tag do commit estável anterior.
2. Executar checkout do commit desejado no host do CT223: `git checkout <STABLE_COMMIT_SHA>`.
3. Executar o rebuild do container: `docker compose build && docker compose up -d`.
4. Caso tenha ocorrido alteração incompatível de schema, restaurar o banco de dados prévio ao deploy.
