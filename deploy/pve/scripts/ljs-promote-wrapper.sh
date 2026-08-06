#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# PVE Host Restricted Promotion Wrapper for CT223
#
# Installed to /usr/local/sbin/ljs-promote-production (mode 0755 root:root)
# Executed by ljs-deploy user via NOPASSWD sudo rule.
#
# Accepts ONLY:
#   --commit <40 hex SHA>
#   --digest sha256:<64 hex>
#   [--run-id <RUN_ID>] [--actor <ACTOR>]
# ---------------------------------------------------------------------------
set -euo pipefail

RELEASE_COMMIT=""
RELEASE_DIGEST=""
PROMOTION_RUN_ID="manual"
PROMOTION_ACTOR="system"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --commit)
      RELEASE_COMMIT="$2"
      shift 2
      ;;
    --digest)
      RELEASE_DIGEST="$2"
      shift 2
      ;;
    --run-id)
      PROMOTION_RUN_ID="$2"
      shift 2
      ;;
    --actor)
      PROMOTION_ACTOR="$2"
      shift 2
      ;;
    *)
      echo "FATAL: unauthorized or unknown parameter: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${RELEASE_COMMIT}" || -z "${RELEASE_DIGEST}" ]]; then
  echo "FATAL: --commit <FULL_SHA> and --digest sha256:<64_HEX> required" >&2
  exit 1
fi

if [[ ! "${RELEASE_COMMIT}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "FATAL: --commit must be a 40-character hexadecimal SHA" >&2
  exit 1
fi

if [[ ! "${RELEASE_DIGEST}" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  echo "FATAL: --digest must be sha256:<64_hex>" >&2
  exit 1
fi

DEPLOY_SCRIPT=""
if [[ -f "/opt/lia-job-search/deploy/pve/scripts/deploy-ct223.sh" ]]; then
  DEPLOY_SCRIPT="/opt/lia-job-search/deploy/pve/scripts/deploy-ct223.sh"
elif [[ -f "/root/workspace/lia-job-search/deploy/pve/scripts/deploy-ct223.sh" ]]; then
  DEPLOY_SCRIPT="/root/workspace/lia-job-search/deploy/pve/scripts/deploy-ct223.sh"
else
  echo "FATAL: deploy-ct223.sh script not found" >&2
  exit 1
fi

exec bash "${DEPLOY_SCRIPT}" --commit "${RELEASE_COMMIT}" --digest "${RELEASE_DIGEST}" --run-id "${PROMOTION_RUN_ID}" --actor "${PROMOTION_ACTOR}"
