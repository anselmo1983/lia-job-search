# Resposta a Incidentes (Incident Response)

## Procedimentos de Emergência

### 1. Corrupção de Banco de Dados
- Executar `tools/restore.sh` apontando para o último backup válido em `/opt/lia-job-search/data/backups/`.
- Reiniciar o container `lia-job-search`.

### 2. Acesso Não Autorizado / Comprometimento de Sessão
- Invalidar todas as sessões ativas limpando a tabela `session`:
  `sqlite3 /opt/lia-job-search/data/database/lia.db "DELETE FROM session;"`
- Alterar a chave `BETTER_AUTH_SECRET` em `runtime.env` e reiniciar a aplicação.
