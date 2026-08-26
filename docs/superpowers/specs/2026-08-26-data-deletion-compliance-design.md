# Data Deletion Compliance — Design Spec

**Status:** Approved for planning
**Date:** 2026-08-26
**Repos affected:** `backend-rc` (all schema/logic changes), `admin-dashboard-rc` (DPA/TODO doc alignment only — no frontend changes required)

## Why

The Data Processing Agreement (`admin-dashboard-rc/src/app/data-processing-agreement/page.tsx`, Section 9) commits to deleting tenant customer data within 30 days of account termination. Auditing the actual schema and backend code found that commitment is currently unenforced: a tenant can be "offboarded" (access blocked), but nothing ever performs the actual deletion, no equivalent mechanism exists for individual user accounts, and no tooling exists for an individual end-customer's data-subject deletion request. This spec closes those three gaps.

## Current State (verified against the live schema and code, 2026-08-26)

**Already built, working:**
- `tenants` table has `status`, `offboarded_at`, `data_retention_expires_at` columns
- `POST /:tenantId/offboard` (`backend-rc/routes/tenants.js`, admin-only): deactivates all `user_tenant_roles` rows for the tenant, removes custom domains from Vercel, sets `tenants.status = 'inactive'`, sets `offboarded_at` and `data_retention_expires_at` (currently `NOW() + 90 days`, hardcoded as `DATA_RETENTION_DAYS`)
- `tenantContext` middleware (`backend-rc/middleware/tenantContext.js`) blocks the tenant's public-facing site immediately once `tenants.status != 'active'`, returning 403 `TENANT_OFFBOARDED`
- 65 foreign keys reference `tenants`/`user`; database-level delete rules already exist: ~47 tables `ON DELETE CASCADE` from `tenants`, ~14 tables `ON DELETE SET NULL` from `tenants` holding real tenant content, plus `ops_alert_event`/`ops_flow_metric`/`billing_events`/`stripe_customer` also `SET NULL` (these four are intentionally kept, see below), and 2 tables `ON DELETE NO ACTION` from `user` (`blog_post.author_id`, `detail_slug.auth_id`)

**Gaps this spec closes:**
1. Nothing ever acts on `data_retention_expires_at` — no scheduled purge exists
2. Retention window is 90 days in code; DPA states 30 days
3. `user` table has no `deleted_at`/status column; offboarding only touches `user_tenant_roles`, never the `user` row
4. JWTs default to 7-day expiry (`JWT_EXPIRES_IN`, `backend-rc/routes/auth.js`) and `authMiddleware` only verifies the signature — it never re-checks tenant/user status in the database, so offboarding does not actually cut off dashboard/API access, only the public site
5. The 14 `SET NULL` content tables become permanently orphaned on tenant deletion today (nothing deletes them), which does not satisfy "delete the data"
6. No tooling exists for a single end-customer (a tenant's own customer — not a `user` row) to have their PII redacted from leads/bookings/estimates/reservations

## Goals

- Enforce the 30-day retention window end-to-end: offboard → wait → purge, automatically
- Extend the same pattern to individual `user` account deletion
- Close the dashboard-access gap so "deactivated" is actually immediate, not "immediate for the public site, up to 7 days for the dashboard"
- Provide a tenant-scoped PII redaction tool for individual end-customer deletion requests, fulfilling DPA Section 7
- Do not touch data that has independent legal retention requirements (billing/tax records) or that carries no tenant PII (internal ops metrics)

## Non-Goals

- No self-service "delete my account" UI in this pass — offboarding and user deletion remain admin-triggered via API, same as today. A self-service UI can be layered on top of the API built here as separate follow-up work.
- No GDPR-specific mechanisms (Standard Contractual Clauses, EU representative) — matches the DPA's current US-only scope.
- No change to the CASCADE/SET NULL rules already correct today (billing_events, stripe_customer, ops_alert_event, ops_flow_metric stay SET NULL and un-purged).

---

## Part A — Tenant Offboarding: Retention Enforcement

### A1. Fix the retention window

`backend-rc/routes/tenants.js`: change `const DATA_RETENTION_DAYS = 90;` to `30`, matching the DPA. Existing tenants already offboarded under the 90-day value keep their originally-set `data_retention_expires_at` (do not retroactively shorten an already-communicated deadline) — the purge job only acts on whatever `data_retention_expires_at` was actually stored per tenant, not a hardcoded recompute.

### A2. New column

Add `purged_at timestamp with time zone NULL` to `tenants` (migration, following the existing `migrations/1781000000000_add-offboarding-columns.js` pattern). Used to mark completion and prevent the purge job from reprocessing a tenant.

### A3. Purge logic

New function, e.g. `backend-rc/lib/tenantPurge.js`, `purgeTenantData(tenantId)`:

1. Verify `tenants.status = 'inactive'` and `purged_at IS NULL` (defensive — never purge an active tenant even if called directly).
2. Inside a transaction, explicitly `DELETE FROM <table> WHERE tenant_id = $1` for the 14 content-bearing `SET NULL` tables: `asset`, `blog_post`, `business_listing`, `detail_slug`, `email_notify_dlq`, `image`, `location_local`, `page`, `page_category`, `product`, `service`, `site_settings`, `team_member`, `website`.
3. Deliberately skip (leave as `SET NULL`/orphaned, do not delete): `billing_events`, `stripe_customer` (financial/tax retention), `ops_alert_event`, `ops_flow_metric` (internal monitoring, no tenant PII).
4. `DELETE FROM tenants WHERE id = $1` — the ~47 `CASCADE` tables clean up automatically via existing FK constraints.
5. Commit. (Note: since step 4 deletes the tenant row itself, `purged_at` cannot be stamped on it afterward — log the purge completion via the existing ops-event/audit logging pattern used elsewhere in the codebase instead, e.g. `ops_alert_event` or equivalent, so there's still a durable record of *when* a given tenant ID was purged even though the tenant row itself is gone.)

### A4. Scheduled job

A cron-triggered endpoint or scheduled task (match whatever scheduling mechanism this codebase already uses elsewhere — check for an existing cron/worker pattern before introducing a new one) that:

```sql
SELECT id FROM public.tenants
WHERE status = 'inactive' AND data_retention_expires_at <= NOW() AND purged_at IS NULL
```

and calls `purgeTenantData(id)` for each. Runs at most daily — no need for finer granularity on a 30-day window.

### A5. Close the dashboard-access gap

`backend-rc/middleware/authMiddleware.js` currently only verifies the JWT signature. Add a status check after verification:

- If `req.auth.role` is not `admin`/`platform_admin` (platform staff must retain access to manage an offboarded tenant, e.g. to review or restore it) **and** `req.auth.activeTenantId` is present, look up that tenant's `status`; reject with 401 (`code: "TENANT_OFFBOARDED"`, matching the existing code used by `tenantContext`) if not `'active'`.
- Regardless of role, reject if the authenticated `user.deleted_at IS NOT NULL` (Part B) — a deleted user should never authenticate, admin or not.

This necessarily adds a DB lookup to every authenticated request. Accept this cost — correctness on an access-control check outweighs the extra query, and this codebase already does per-request DB lookups elsewhere in the auth path (e.g., `/auth/me`).

---

## Part B — Individual User Deletion

### B1. New column

Add `deleted_at timestamp with time zone NULL` to `user` (currently has no soft-delete column of any kind).

### B2. Deletion endpoint

New admin-only route, e.g. `POST /users/:userId/delete-request`:

1. Set `user.deleted_at = NOW()` immediately — combined with A5, this blocks login/API access right away.
2. Set all of that user's `user_tenant_roles` rows to `status = 'inactive'`.
3. Do **not** delete the `user` row yet — retain for the 30-day window, consistent with tenant offboarding.

### B3. NO ACTION foreign keys

Two tables reference `user` with `ON DELETE NO ACTION`, which would block the eventual hard delete: `blog_post.author_id`, `detail_slug.auth_id`. At purge time (B4), reassign these to `NULL` before deleting the `user` row (both columns are nullable per the current schema — confirm at implementation time; if either is `NOT NULL`, that column needs a migration to make it nullable first, since content authored by a deleted user should not block that user's deletion).

### B4. Purge logic

Extend the same scheduled job (A4) with a parallel query:

```sql
SELECT id FROM public."user"
WHERE deleted_at IS NOT NULL AND deleted_at <= NOW() - INTERVAL '30 days'
```

For each: null out `blog_post.author_id` and `detail_slug.auth_id` where they reference this user, then `DELETE FROM "user" WHERE id = $1` (the `user_tenant_roles` rows referencing them are already `ON DELETE CASCADE` from `user`, confirmed in the FK audit).

---

## Part C — End-Customer PII Redaction

Different mechanism from Parts A/B: this is field-level redaction inside retained business records, not row deletion, and executes immediately rather than after a retention window (no reactivation-window rationale applies to a one-off data-subject request).

### C1. Scope the PII surface

Before implementation, enumerate every table/column holding a tenant's own customer's identifying data. Known from this session's work so far: `outreach_leads` (email, phone, contact_name), `booking_request`, `estimate`, `reservation` — the implementation plan must do a full column-level audit of these (and any others found) rather than relying on this list being exhaustive, since an incomplete redaction would be a real compliance failure, not just a bug.

### C2. Redaction endpoint

New admin-only route, e.g. `POST /tenants/:tenantId/redact-customer`, given an identifying email or phone:

1. Find every matching row across the scoped tables, restricted to that tenant.
2. Null out PII columns (name, email, phone, free-text fields likely to contain PII) while leaving non-PII business data intact (amounts, dates, statuses) so financial/analytics history stays accurate.
3. Log the redaction (what was redacted, when, by whom) for audit purposes — this itself must not retain the PII that was just redacted.

### C3. Relationship to the DPA

This directly implements DPA Section 7 ("Assistance with Data Subject Requests"), which currently exists as a written commitment with no supporting tooling.

---

## Open Questions for the Implementation Plan

- What scheduling mechanism does this codebase already use for recurring jobs (if any)? Prefer reusing it over introducing a new one.
- Confirm nullability of `blog_post.author_id` and `detail_slug.auth_id` before relying on B3's null-out approach.
- Confirm the full PII column surface for Part C (C1) — do not implement against an assumed-complete table list.
- Audit logging destination for purge/redaction events (A3, C2) — use whatever existing pattern this codebase has for durable operational audit trails.
