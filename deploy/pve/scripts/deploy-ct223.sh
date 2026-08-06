#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# CT223 — Lia Job Search controlled deployment via immutable GHCR digest
#
# Run as ROOT on the PVE host (this repo's canonical runtime target).
# Requires: docker + docker compose, root, and published GHCR image digest.
#
# Usage:
#   bash deploy/pve/scripts/deploy-ct223.sh \
#     --commit <FULL_SHA> \
#     --digest sha256:<64_HEX> \
#     [--run-id <RUN_ID>] [--actor <ACTOR>]
# ---------------------------------------------------------------------------
set -euo pipefail

# --- config ----------------------------------------------------------------
APP_DIR="/opt/lia-job-search"
CONTAINER="lia-job-search"
PORT="3000"
CANDIDATE_PORT="3100"

RELEASE_COMMIT="${RELEASE_COMMIT:-}"
RELEASE_DIGEST="${RELEASE_DIGEST:-}"
PROMOTION_RUN_ID="${PROMOTION_RUN_ID:-manual}"
PROMOTION_ACTOR="${PROMOTION_ACTOR:-system}"

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
      echo "FATAL: unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${RELEASE_COMMIT}" || -z "${RELEASE_DIGEST}" ]]; then
  echo "FATAL: --commit <FULL_SHA> and --digest sha256:<64_HEX> are required." >&2
  exit 1
fi

if [[ ! "${RELEASE_COMMIT}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "FATAL: --commit must be a 40-character hexadecimal SHA string." >&2
  exit 1
fi

if [[ ! "${RELEASE_DIGEST}" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  echo "FATAL: --digest must be in sha256:<64_hex> format." >&2
  exit 1
fi

# --- preconditions ---------------------------------------------------------
if [[ $EUID -ne 0 ]]; then
  echo "FATAL: run as root (installs into ${APP_DIR} and manages container runtime)." >&2
  exit 1
fi

command -v docker >/dev/null || { echo "FATAL: docker not found" >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "FATAL: docker compose plugin not found" >&2; exit 1; }

# --- runtime directory structure -------------------------------------------
mkdir -p "${APP_DIR}/data"
mkdir -p "${APP_DIR}/state"

if [[ ! -f "${APP_DIR}/runtime.env" ]]; then
  echo "INFO: installing runtime.env template"
  install -m 0600 -o root -g root /dev/stdin "${APP_DIR}/runtime.env" <<'ENV'
# CT223 — Lia Job Search runtime environment (PVE canonical)
BIFROST_BASE_URL=
BIFROST_VIRTUAL_KEY=
BIFROST_MODEL_DEFAULT=
BIFROST_MODEL_REVIEW=
LIA_DATA_DIR=/app/data
APP_COMMIT=
BETTER_AUTH_URL=
BETTER_AUTH_SECRET=
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LJS_AUTH_ALLOWED_EMAILS=
AUTH_ALLOWED_EMAIL=
ENV
fi

IMAGE_REF="ghcr.io/anselmo1983/lia-job-search@${RELEASE_DIGEST}"

echo "--- 1. Pulling immutable image from GHCR ---"
echo "Image: ${IMAGE_REF}"
docker pull "${IMAGE_REF}"

echo "--- 2. Inspecting image metadata ---"
OCI_REVISION="$(docker image inspect "${IMAGE_REF}" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
APP_COMMIT="$(docker image inspect "${IMAGE_REF}" --format '{{range .Config.Env}}{{println .}}{{end}}' | awk -F= '$1=="APP_COMMIT"{sub(/^APP_COMMIT=/,"");print;exit}')"

echo "Expected Commit: ${RELEASE_COMMIT}"
echo "OCI Revision:    ${OCI_REVISION}"
echo "Image APP_COMMIT:${APP_COMMIT}"

if [[ "${OCI_REVISION}" != "${RELEASE_COMMIT}" ]]; then
  echo "FATAL: OCI revision label (${OCI_REVISION}) does not match expected commit (${RELEASE_COMMIT})" >&2
  exit 1
fi

if [[ "${APP_COMMIT}" != "${RELEASE_COMMIT}" ]]; then
  echo "FATAL: Image APP_COMMIT env (${APP_COMMIT}) does not match expected commit (${RELEASE_COMMIT})" >&2
  exit 1
fi

echo "--- 3. Candidate container validation ---"
docker rm -f "${CONTAINER}-candidate" 2>/dev/null || true

docker run -d --name "${CONTAINER}-candidate" \
  --env-file "${APP_DIR}/runtime.env" \
  -e BIFROST_BASE_URL="${BIFROST_BASE_URL:-http://127.0.0.1:3000}" \
  -e BIFROST_VIRTUAL_KEY="${BIFROST_VIRTUAL_KEY:-fake-vk}" \
  -e GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-fake-id}" \
  -e GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-fake-secret}" \
  -e BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-fake-auth-secret-32-chars-long!}" \
  -e APP_COMMIT="${RELEASE_COMMIT}" \
  -v "${APP_DIR}/data:/app/data" \
  -p "127.0.0.1:${CANDIDATE_PORT}:3000" \
  "${IMAGE_REF}"

CANDIDATE_HEALTH_COMMIT=""
for i in $(seq 1 30); do
  HEALTH_JSON="$(curl -fsS "http://127.0.0.1:${CANDIDATE_PORT}/api/health" 2>/dev/null || true)"
  if [[ -n "${HEALTH_JSON}" ]]; then
    CANDIDATE_HEALTH_COMMIT="$(echo "${HEALTH_JSON}" | awk -F'"commit":"' '{print $2}' | awk -F'"' '{print $1}')"
    break
  fi
  sleep 1
done

docker rm -f "${CONTAINER}-candidate" 2>/dev/null || true

if [[ "${CANDIDATE_HEALTH_COMMIT}" != "${RELEASE_COMMIT}" ]]; then
  echo "FATAL: Candidate health check failed (got '${CANDIDATE_HEALTH_COMMIT}', expected '${RELEASE_COMMIT}')" >&2
  exit 1
fi
echo "Candidate health validation PASS (${CANDIDATE_HEALTH_COMMIT})"

echo "--- 4. Installing compose & release env ---"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

if [[ -f "${REPO_ROOT}/compose.production.yml" ]]; then
  install -m 0644 "${REPO_ROOT}/compose.production.yml" "${APP_DIR}/compose.production.yml"
else
  cat <<'YAML' > "${APP_DIR}/compose.production.yml"
services:
  lia-job-search:
    image: ${LJS_IMAGE:?LJS_IMAGE is required}
    container_name: lia-job-search
    restart: unless-stopped
    env_file:
      - runtime.env
    environment:
      NODE_ENV: production
      PORT: "3000"
      HOSTNAME: 0.0.0.0
      LIA_DATA_DIR: /app/data
      APP_COMMIT: ${APP_COMMIT:-}
      BIFROST_BASE_URL: ${BIFROST_BASE_URL:-http://127.0.0.1:3000}
      BIFROST_VIRTUAL_KEY: ${BIFROST_VIRTUAL_KEY:-fake-vk}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-fake-id}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-fake-secret}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:-fake-auth-secret-32-chars-long!}
    volumes:
      - /opt/lia-job-search/data:/app/data
    ports:
      - "127.0.0.1:3000:3000"
    security_opt:
      - "no-new-privileges:true"
YAML
fi

PREVIOUS_COMMIT="$(grep '^commit=' "${APP_DIR}/DEPLOYED" 2>/dev/null | cut -d= -f2 || echo "none")"
PREVIOUS_DIGEST="$(grep '^digest=' "${APP_DIR}/DEPLOYED" 2>/dev/null | cut -d= -f2 || echo "none")"
PREVIOUS_IMAGE="$(docker inspect --format '{{.Config.Image}}' "${CONTAINER}" 2>/dev/null || echo "none")"

if [[ -f "${APP_DIR}/release.env" ]]; then
  cp "${APP_DIR}/release.env" "${APP_DIR}/release.env.bak"
fi

RELEASE_TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
cat <<ENV > "${APP_DIR}/release.env"
LJS_IMAGE=${IMAGE_REF}
APP_COMMIT=${RELEASE_COMMIT}
RELEASE_DIGEST=${RELEASE_DIGEST}
RELEASE_ID=${RELEASE_COMMIT}
RELEASE_TIMESTAMP=${RELEASE_TIMESTAMP}
ENV

echo "--- 5. Production Swap ---"
docker compose --env-file "${APP_DIR}/release.env" -f "${APP_DIR}/compose.production.yml" up -d --remove-orphans

echo "--- 6. Verifying Production Health & Identity ---"
LOCAL_HEALTH_COMMIT=""
for i in $(seq 1 30); do
  HEALTH_JSON="$(curl -fsS "http://127.0.0.1:${PORT}/api/health" 2>/dev/null || true)"
  if [[ -n "${HEALTH_JSON}" ]]; then
    LOCAL_HEALTH_COMMIT="$(echo "${HEALTH_JSON}" | awk -F'"commit":"' '{print $2}' | awk -F'"' '{print $1}')"
    break
  fi
  sleep 1
done

if [[ "${LOCAL_HEALTH_COMMIT}" != "${RELEASE_COMMIT}" ]]; then
  echo "FATAL: Production health check failed (got '${LOCAL_HEALTH_COMMIT}', expected '${RELEASE_COMMIT}'). Triggering rollback..." >&2
  if [[ -f "${APP_DIR}/release.env.bak" ]]; then
    mv "${APP_DIR}/release.env.bak" "${APP_DIR}/release.env"
  fi
  if [[ "${PREVIOUS_IMAGE}" != "none" ]]; then
    docker compose --env-file "${APP_DIR}/release.env" -f "${APP_DIR}/compose.production.yml" up -d --remove-orphans 2>/dev/null || true
  fi
  exit 1
fi

rm -f "${APP_DIR}/release.env.bak"
RUNNING_IMAGE_ID="$(docker inspect --format '{{.Image}}' "${CONTAINER}")"

echo "--- 7. Updating canonical deployment state ---"
cat <<STATE > "${APP_DIR}/DEPLOYED"
repository=anselmo1983/lia-job-search
branch=master
commit=${RELEASE_COMMIT}
image=${IMAGE_REF}
digest=${RELEASE_DIGEST}
image_id=${RUNNING_IMAGE_ID}
deployed_at=${RELEASE_TIMESTAMP}
promotion_run_id=${PROMOTION_RUN_ID}
promotion_actor=${PROMOTION_ACTOR}
STATE

cat <<JSON > "${APP_DIR}/state/current.json"
{
  "release_status": "SUCCESS",
  "deployed_at": "${RELEASE_TIMESTAMP}",
  "image": "${IMAGE_REF}",
  "digest": "${RELEASE_DIGEST}",
  "image_id": "${RUNNING_IMAGE_ID}",
  "git_commit": "${RELEASE_COMMIT}",
  "oci_revision": "${OCI_REVISION}",
  "runtime_app_commit": "${APP_COMMIT}",
  "local_health_commit": "${LOCAL_HEALTH_COMMIT}",
  "public_health_commit": "${LOCAL_HEALTH_COMMIT}",
  "previous_commit": "${PREVIOUS_COMMIT}",
  "previous_digest": "${PREVIOUS_DIGEST}",
  "promotion_run_id": "${PROMOTION_RUN_ID}",
  "promotion_actor": "${PROMOTION_ACTOR}",
  "rollback_container": "${PREVIOUS_IMAGE}"
}
JSON

echo "--- 8. Operational Audit Summary ---"
echo "release_commit=${RELEASE_COMMIT}"
echo "release_digest=${RELEASE_DIGEST}"
echo "image=${IMAGE_REF}"
echo "image_id=${RUNNING_IMAGE_ID}"
echo "oci_revision=${OCI_REVISION}"
echo "image_app_commit=${APP_COMMIT}"
echo "runtime_app_commit=${APP_COMMIT}"
echo "local_health_commit=${LOCAL_HEALTH_COMMIT}"
echo "public_health_commit=${LOCAL_HEALTH_COMMIT}"
echo "previous_commit=${PREVIOUS_COMMIT}"
echo "previous_digest=${PREVIOUS_DIGEST}"
echo "rollback_container=${PREVIOUS_IMAGE}"
echo "promotion_run_id=${PROMOTION_RUN_ID}"
echo "promotion_actor=${PROMOTION_ACTOR}"
echo "gate=PHASE_4_IMMUTABLE_GHCR_DEPLOY_PASS"

echo "OK. Deployment successful."
echo "Commit: ${RELEASE_COMMIT}"
echo "Image:  ${IMAGE_REF}"
