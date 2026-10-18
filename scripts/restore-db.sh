#!/usr/bin/env bash
# =============================================================================
# BookMeBadminton - PostgreSQL Production Restore Script
# Usage: ./scripts/restore-db.sh <PATH_TO_BACKUP_FILE> <TARGET_DATABASE_URL>
# CAUTION: This replaces data in the specified TARGET_DATABASE_URL!
# =============================================================================

set -euo pipefail

BACKUP_FILE="${1:-}"
TARGET_DB_URL="${2:-}"

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' does not exist or was not specified." >&2
  echo "Usage: $0 <PATH_TO_BACKUP_FILE> <TARGET_DATABASE_URL>" >&2
  exit 1
fi

if [ -z "${TARGET_DB_URL}" ]; then
  echo "Error: TARGET_DATABASE_URL was not specified." >&2
  echo "Usage: $0 <PATH_TO_BACKUP_FILE> <TARGET_DATABASE_URL>" >&2
  exit 1
fi

echo "======================================================================="
echo "WARNING: Restoring will overwrite existing data in the target database!"
echo "Target: ${TARGET_DB_URL}"
echo "Backup: ${BACKUP_FILE}"
echo "======================================================================="
read -rp "Are you sure you want to proceed with restoration? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Restoration aborted."
  exit 0
fi

echo "==> Restoring database from ${BACKUP_FILE}..."

pg_restore \
  --dbname="${TARGET_DB_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${BACKUP_FILE}"

echo "==> Restoration completed successfully!"
