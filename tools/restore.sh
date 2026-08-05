#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# CT223 Lia Job Search — Restore Script
# Valida e restaura o banco SQLite lia.db e documentos a partir de um backup.
# ==============================================================================

if [ "$#" -ne 1 ]; then
  echo "Uso: $0 <caminho_do_diretorio_de_backup>"
  exit 1
fi

BACKUP_DIR="$1"
DATA_DIR="${LIA_DATA_DIR:-/opt/lia-job-search/data}"

if [ ! -d "${BACKUP_DIR}" ]; then
  echo "Erro: Diretório de backup '${BACKUP_DIR}' não existe."
  exit 1
fi

echo "=== Iniciando Restauração CT223 ==="

# 1. Verificar checksums SHA-256
if [ -f "${BACKUP_DIR}/sha256sums.txt" ]; then
  echo "[Restore] Verificando integridade SHA-256..."
  (cd "${BACKUP_DIR}" && sha256sum -c sha256sums.txt)
else
  echo "[Aviso] Manifesto sha256sums.txt não encontrado no backup."
fi

# 2. Restaurar SQLite
if [ -f "${BACKUP_DIR}/lia.db" ]; then
  echo "[Restore] Restaurando banco SQLite para ${DATA_DIR}/database/lia.db..."
  mkdir -p "${DATA_DIR}/database"
  cp "${BACKUP_DIR}/lia.db" "${DATA_DIR}/database/lia.db"
  chmod 0600 "${DATA_DIR}/database/lia.db"
fi

# 3. Restaurar Documentos
if [ -d "${BACKUP_DIR}/documents" ]; then
  echo "[Restore] Restaurando documentos privados para ${DATA_DIR}/documents..."
  mkdir -p "${DATA_DIR}/documents"
  chmod 0700 "${DATA_DIR}/documents"
  cp -r "${BACKUP_DIR}/documents/"* "${DATA_DIR}/documents/" 2>/dev/null || true
  chmod 0600 "${DATA_DIR}/documents/"* 2>/dev/null || true
fi

echo "=== Restauração concluída com sucesso. ==="
