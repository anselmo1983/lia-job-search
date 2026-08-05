# Runbook — Restauração de Backup

## Procedimento
1. Identificar a pasta do backup desejado em `/opt/lia-job-search/data/backups/`.
2. Executar o script: `./tools/restore.sh /opt/lia-job-search/data/backups/YYYYMMDD_HHMMSS`.
3. Validar os checksums reportados pelo script.
4. Reiniciar o container `lia-job-search`.
