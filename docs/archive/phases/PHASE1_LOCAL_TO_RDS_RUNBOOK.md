# Phase 1 Local PostgreSQL to AWS RDS Runbook

Date: 2026-03-23
Scope: Tenant foundation migration for Phase 1

## 1) Objective

Run Phase 1 migration on local PostgreSQL first, validate tenant isolation basics, then promote to AWS RDS.

Migration file:

- `backend-rc/migrations/1779000000000_phase1_tenant-foundation.js`
- Verification script: `backend-rc/scripts/verify-phase1-tenant-foundation.js`

## 2) Prerequisites

- Local PostgreSQL running
- Access to backend repo migration workflow
- Staging and production RDS credentials
- Backup/restore permissions for RDS

## 3) Local Execution Steps

1. Create a fresh local database snapshot/backup.
2. Apply migration in local environment.
3. Run smoke checks listed below.
4. Fix any schema/data issues before promoting.

Example command (from backend repo):

```bash
cd ../backend-rc
npm run migrate:up
node scripts/verify-phase1-tenant-foundation.js
```

## 4) Required Smoke Checks

Run these checks after local migration:

1. Core tables exist:

```sql
SELECT to_regclass('public.tenants');
SELECT to_regclass('public.tenant_domains');
SELECT to_regclass('public.user_tenant_roles');
SELECT to_regclass('public.tenant_modules');
SELECT to_regclass('public.tenant_features');
```

2. Tenant backfill from `website` exists:

```sql
SELECT COUNT(*) AS website_count FROM public.website;
SELECT COUNT(*) AS tenant_count FROM public.tenants;
```

3. Domain mapping backfill exists:

```sql
SELECT COUNT(*) AS active_domains FROM public.tenant_domains WHERE status = 'active';
```

4. `tenant_id` backfill coverage sample:

```sql
SELECT 'page' AS table_name, COUNT(*) AS null_tenant_rows
FROM public.page
WHERE website_id IS NOT NULL AND tenant_id IS NULL
UNION ALL
SELECT 'service', COUNT(*)
FROM public.service
WHERE website_id IS NOT NULL AND tenant_id IS NULL
UNION ALL
SELECT 'user', COUNT(*)
FROM public."user"
WHERE website_id IS NOT NULL AND tenant_id IS NULL;
```

Expected: `null_tenant_rows = 0` for migrated rows.

## 5) Promotion Path To AWS RDS

Recommended order:

1. Apply migration in staging RDS.
2. Execute same smoke checks.
3. Run application-level smoke tests (tenant routing + basic CRUD).
4. Schedule production migration window.
5. Apply migration to production RDS.
6. Re-run smoke checks and monitor errors.

Example command:

```bash
cd ../backend-rc
npm run migrate:up
```

## 6) Rollback Guidance

Because this migration adds tables/columns and backfills data, rollback should be handled with a tested down-migration script and verified backup restore path.

Minimum rollback readiness:

- Pre-migration backup snapshot available
- Down migration reviewed in staging
- Team owner assigned for rollback execution

## 7) Phase 1 Completion Criteria (Execution)

- Migration applied successfully in local and staging
- No cross-tenant leakage in test scenarios
- No critical regression in page manager/site settings/public render
- Approved for production rollout
