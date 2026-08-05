#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# CT223 — Lia Job Search controlled deployment to PVE
#
# Run as ROOT on the PVE host (this repo's canonical runtime target).
# Requires: docker + docker compose, root, and a built image (or Dockerfile).
#
# Canonical layout created here:
#   /opt/lia-job-search/
#   ├── runtime.env      # mode 0600 root:root — Bifrost CT109 secrets
#   ├── compose.yml      # from repo (context: repo dir)
#   ├── data/            # persistent app data (CV, profile, tracker, jobs)
#   └── src/             # repo checkout (build context)
#
# After this script, the app listens on :3000 and reports /api/health.
# ---------------------------------------------------------------------------
set -euo pipefail

# --- config ----------------------------------------------------------------
APP_DIR="/opt/lia-job-search"
REPO_URL="https://github.com/anselmo1983/lia-job-search.git"
REPO_BRANCH="master"
COMMIT_PIN="650389e5bdd92220c23e3b48371aabfb93d427f8"
CONTAINER="lia-job-search"
PORT="3000"

# --- preconditions ---------------------------------------------------------
if [[ $EUID -ne 0 ]]; then
  echo "FATAL: run as root (this installs into ${APP_DIR} and sets 0600 root:root)." >&2
  exit 1
fi
command -v docker >/dev/null || { echo "FATAL: docker not found" >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "FATAL: docker compose plugin not found" >&2; exit 1; }

# --- install runtime.env (refuse to clobber real secrets) ------------------
mkdir -p "${APP_DIR}/data"
if [[ ! -f "${APP_DIR}/runtime.env" ]]; then
  echo "INFO: installing runtime.env"
  install -m 0600 -o root -g root /dev/stdin "${APP_DIR}/runtime.env" <<'ENV'
# CT223 — Lia Job Search runtime environment (PVE canonical)
#   mode 0600 root:root; filled in before first start
BIFROST_BASE_URL=
BIFROST_VIRTUAL_KEY=
BIFROST_MODEL_DEFAULT=
BIFROST_MODEL_REVIEW=
LIA_DATA_DIR=/app/data
APP_COMMIT=
ENV
else
  echo "INFO: ${APP_DIR}/runtime.env exists — leaving untouched (fill BIFROST_* yourself if needed)"
fi

# --- checkout / update pinned commit --------------------------------------
if [[ ! -d "${APP_DIR}/src/.git" ]]; then
  git clone --branch "${REPO_BRANCH}" "${REPO_URL}" "${APP_DIR}/src"
fi
cd "${APP_DIR}/src"
git fetch origin
if [[ "$(git rev-parse HEAD)" != "${COMMIT_PIN}" ]]; then
  git checkout "${COMMIT_PIN}"
fi

# --- compose -----------------------------------------------------------------
install -m 0644 compose.yml "${APP_DIR}/compose.yml"

# --- build & start -----------------------------------------------------------
cd "${APP_DIR}"
docker compose build --pull
docker compose up -d --remove-orphans

# --- postcondition: health + bifrost reachability ----------------------------
echo "--- waiting for ${CONTAINER} ---"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then break; fi
  sleep 2
done
echo "--- /api/health ---"
curl -fsS "http://127.0.0.1:${PORT}/api/health" || echo "WARN: health endpoint not responding yet"
echo
echo "--- bifrost reachability (from container) ---"
docker exec "${CONTAINER}" sh -c 'curl -fsS -o /dev/null -w "%{http_code}\n" "$BIFROST_BASE_URL/" ' 2>/dev/null \
  || echo "WARN: BIFROST_BASE_URL not reachable / not set — set it in ${APP_DIR}/runtime.env"

echo
echo "OK. Lia Job Search deployed. Logs:  docker compose -f ${APP_DIR}/compose.yml logs -f"
