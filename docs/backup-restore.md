# Backup e Restauração

## Backup Automatizado
O script `tools/backup.sh` executa o backup consistente do banco `lia.db` via `VACUUM INTO` e empacota os PDFs privados com um manifesto de checksums SHA-256 (`sha256sums.txt`).

```bash
./tools/backup.sh
```

## Restauração de Dados
O script `tools/restore.sh` valida o checksum SHA-256 e restaura o banco de dados e arquivos privados para `<LIA_DATA_DIR>`.

```bash
./tools/restore.sh /opt/lia-job-search/data/backups/YYYYMMDD_HHMMSS
```
