#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# CT223 Lia Job Search — Backup Script
# Realiza o backup consistente do banco SQLite lia.db e dos documentos/PDFs privados.
# ==============================================================================

DATA_DIR="${LIA_DATA_DIR:-/opt/lia-job-search/data}"
BACKUP_ROOT="${DATA_DIR}/backups"
TIMESTAMP="$(date -u +'%Y%m%d_%H%M%S')"
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"

mkdir -p "${BACKUP_DIR}/documents"

echo "=== Iniciando Backup CT223: ${TIMESTAMP} ==="

# 1. Backup consistente do SQLite via VACUUM INTO / copy seguro
DB_FILE="${DATA_DIR}/database/lia.db"
BACKUP_DB="${BACKUP_DIR}/lia.db"

if [ -f "${DB_FILE}" ]; then
  if command -v sqlite3 >/dev/null 2>&1; then
    echo "[Backup] Executando VACUUM INTO no banco SQLite..."
    sqlite3 "${DB_FILE}" "VACUUM INTO '${BACKUP_DB}';"
  else
    echo "[Backup] sqlite3 CLI não encontrado; copiando arquivo de banco..."
    cp "${DB_FILE}" "${BACKUP_DB}"
  fi
else
  echo "[Aviso] Banco de dados ${DB_FILE} não encontrado."
fi

# 2. Backup dos Documentos Privados
DOCS_DIR="${DATA_DIR}/documents"
if [ -d "${DOCS_DIR}" ]; then
  echo "[Backup] Copiando documentos privados..."
  cp -r "${DOCS_DIR}/"* "${BACKUP_DIR}/documents/" 2>/dev/null || true
fi

# 3. Gerar Manifesto SHA-256 e metadata
MANIFEST="${BACKUP_DIR}/manifest.json"
cat <<EOF > "${MANIFEST}"
{
  "timestamp": "${TIMESTAMP}",
  "backup_dir": "${BACKUP_DIR}",
  "created_at": "$(date -u -Iseconds)"
}
EOF

echo "[Backup] Gerando checksums SHA-256..."
cd "${BACKUP_DIR}"
find . -type f ! -name "sha256sums.txt" -exec sha256sum {} + > sha256sums.txt

echo "=== Backup concluído com sucesso em: ${BACKUP_DIR} ==="
