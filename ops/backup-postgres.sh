#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

APP_DIR="${SHRTEN_APP_DIR:-/opt/apps/shrten}"
BACKUP_DIR="${SHRTEN_BACKUP_DIR:-/opt/backups/shrten}"
ENV_FILE="${SHRTEN_ENV_FILE:-${APP_DIR}/.env.production}"

if [[ ! -r "${ENV_FILE}" ]]; then
  echo "Production environment file is not readable: ${ENV_FILE}" >&2
  exit 1
fi

set -a
# The production environment file is generated locally on the VPS and is not tracked.
source "${ENV_FILE}"
set +a

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date --utc +%Y%m%dT%H%M%SZ)"
FINAL_BACKUP="${BACKUP_DIR}/shrten-${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"
TEMPORARY_BACKUP="$(mktemp "${BACKUP_DIR}/.shrten-${TIMESTAMP}.XXXXXX")"

cleanup() {
  rm -f "${TEMPORARY_BACKUP}"
}

trap cleanup EXIT

cd "${APP_DIR}"
docker compose \
  --env-file "${ENV_FILE}" \
  -f docker-compose.production.yml \
  exec -T database \
  pg_dump \
  --username="${POSTGRES_USER:-shrten}" \
  --dbname="${POSTGRES_DB:-shrten}" \
  --format=custom > "${TEMPORARY_BACKUP}"

mv "${TEMPORARY_BACKUP}" "${FINAL_BACKUP}"
trap - EXIT

find "${BACKUP_DIR}" \
  -maxdepth 1 \
  -type f \
  -name 'shrten-*.dump' \
  -mtime "+${RETENTION_DAYS}" \
  -delete

echo "PostgreSQL backup created: ${FINAL_BACKUP}"
