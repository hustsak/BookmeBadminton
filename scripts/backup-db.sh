#!/usr/bin/env bash
# =============================================================================
# BookMeBadminton - PostgreSQL Production Backup Script
# Usage: ./scripts/backup-db.sh [BACKUP_DIR]
# Requires: pg_dump utility, DATABASE_URL environment variable
# =============================================================================

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/bookme_badminton_${TIMESTAMP}.dump"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL environment variable is not set." >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

echo "==> Starting PostgreSQL backup at $(date)..."
echo "==> Target file: ${BACKUP_FILE}"

pg_dump "${DATABASE_URL}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="${BACKUP_FILE}"

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "==> Backup completed successfully!"
echo "==> Location: ${BACKUP_FILE} (Size: ${FILE_SIZE})"

# Retention policy: Keep the last 14 daily backups
find "${BACKUP_DIR}" -name "bookme_badminton_*.dump" -mtime +14 -exec rm {} \; 2>/dev/null || true
echo "==> Retention cleanup complete."
