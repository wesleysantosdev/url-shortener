#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="${SHRTEN_APP_DIR:-/opt/apps/shrten}"
ENV_FILE="${SHRTEN_ENV_FILE:-${APP_DIR}/.env.production}"

if [[ ! -r "${ENV_FILE}" ]]; then
  echo "Production environment file is not readable: ${ENV_FILE}" >&2
  exit 1
fi

cd "${APP_DIR}"

compose=(
  docker compose
  --env-file "${ENV_FILE}"
  -f docker-compose.production.yml
)

"${compose[@]}" config --quiet
"${compose[@]}" up -d --build --remove-orphans --wait --wait-timeout 180

sudo install -m 0644 \
  "${APP_DIR}/ops/shrten-backup.service" \
  /etc/systemd/system/shrten-backup.service
sudo install -m 0644 \
  "${APP_DIR}/ops/shrten-backup.timer" \
  /etc/systemd/system/shrten-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now shrten-backup.timer

"${compose[@]}" ps
