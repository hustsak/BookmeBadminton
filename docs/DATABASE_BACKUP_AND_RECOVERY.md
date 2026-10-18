# BookMeBadminton — Database Backup, Recovery & Migration Runbook

This runbook outlines the operational procedures for managing, backing up, restoring, and applying migrations to the BookMeBadminton PostgreSQL database in production.

---

## 1. Architecture & Strategy

* **DBMS**: PostgreSQL 15+ (Local, Managed Container, or Cloud Managed: Neon, Supabase, AWS RDS, Railway, Render).
* **ORM**: Prisma ORM with explicit migration tracking (`_prisma_migrations` table).
* **Concurrency Locking**: PostgreSQL transactional advisory locks (`pg_advisory_xact_lock`).
* **Backup Tool**: `pg_dump` with custom compressed archive format (`-Fc`).
* **Restore Tool**: `pg_restore` with safety flags (`--clean`, `--if-exists`, `--no-owner`).

---

## 2. Backup Schedules & Retention Policy

| Tier | Frequency | Tool / Method | Retention Period | Storage Target |
| :--- | :--- | :--- | :--- | :--- |
| **Point-in-Time (PITR)** | Continuous (WAL) | Cloud Managed (RDS / Neon / Supabase) | 7 to 14 days | Cloud Storage |
| **Daily Full Backup** | Daily at 02:00 UTC | `scripts/backup-db.sh` (`pg_dump`) | 14 days rolling | Encrypted S3 / Cloud Bucket |
| **Pre-Release Snapshot** | Before every production deployment | Manual snapshot / `scripts/backup-db.sh` | 30 days | Deployment artifact storage |

---

## 3. Creating a Backup

### Using the Automated Shell Script
Ensure the `DATABASE_URL` environment variable is set:

```bash
export DATABASE_URL="postgresql://user:password@hostname:5432/bookme_badminton"
./scripts/backup-db.sh ./backups
```

This creates a compressed backup file: `./backups/bookme_badminton_YYYYMMDD_HHMMSS.dump`.

### Manual Backup Command
```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="bookme_backup_$(date +%Y%m%d_%H%M%S).dump"
```

---

## 4. Verifying Backup Integrity

Never assume a backup file is valid without testing its integrity:

```bash
# 1. Inspect table contents and archive structure without restoring:
pg_restore --list bookme_backup.dump

# 2. Check for expected core tables:
pg_restore --list bookme_backup.dump | grep -E "User|Booking|Court|Venue|Payment"
```

---

## 5. Recovery & Restoration Procedure

> [!CAUTION]
> NEVER test restoration against the live production database. Always restore to a separate staging or test database first to verify data integrity.

### Step 1: Provision Staging Target
Create a temporary or staging PostgreSQL database:
```sql
CREATE DATABASE bookme_recovery_test;
```

### Step 2: Execute Restore
```bash
./scripts/restore-db.sh ./backups/bookme_backup.dump "postgresql://user:password@hostname:5432/bookme_recovery_test"
```

### Step 3: Verify Recovered Records
```bash
# Verify row counts in the restored database
npx prisma db pull --url="postgresql://user:password@hostname:5432/bookme_recovery_test"
```

### Step 4: Production Failover (Emergency Only)
If production data corruption occurs:
1. Put application into maintenance mode (`503 Service Unavailable`).
2. Terminate all active database connections:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'bookme_badminton' AND pid <> pg_backend_pid();
   ```
3. Run `scripts/restore-db.sh` targeting the production database.
4. Verify `/api/health` reports status `ok` and `database.status` is `connected`.
5. Remove maintenance mode and restore traffic.

---

## 6. Safe Production Migration Protocol

> [!IMPORTANT]
> In production, NEVER run `prisma migrate dev` or `prisma db push`. Always use `npx prisma migrate deploy`.

### Pre-Deployment Checklist:
1. Take a fresh snapshot backup using `scripts/backup-db.sh`.
2. Check migration status:
   ```bash
   npx prisma migrate status
   ```
3. Review pending migrations in `prisma/migrations/`.
4. Apply migrations:
   ```bash
   npx prisma migrate deploy
   ```
5. Confirm schema is up to date:
   ```bash
   npx prisma migrate status
   # Expected output: "Database schema is up to date!"
   ```

### Failed Migration Rollback Plan:
If a migration fails during release:
1. Inspect the error output from `prisma migrate deploy`.
2. Do NOT run destructive reset commands.
3. If the schema change broke application logic, roll back application deployment to the previous Docker container / commit.
4. If the database schema is in an inconsistent state, restore from the pre-deployment snapshot created in step 1.
