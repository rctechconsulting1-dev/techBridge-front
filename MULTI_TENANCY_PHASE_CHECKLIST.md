# Multi-Tenancy Phase Checklist

Date: 2026-03-23
Status: Living checklist

Use this checklist as the implementation tracker from kickoff to completion.

## Phase 0 - Alignment and Scope Lock

Goal: freeze architecture decisions before migrations start.

Decision log: see `PHASE0_DECISION_LOG.md`.

- [x] Confirm business type enum values
- [x] Confirm module/add-on enum values
- [x] Confirm role matrix (platform_admin, tenant_owner, tenant_manager, tenant_editor, tenant_viewer, support_agent)
- [x] Confirm launch add-ons (Google Business, SMS, Google Ads, custom AI agent)
- [x] Confirm enterprise carve-out triggers
- [x] Confirm email provider and Stripe Connect model
- [x] Confirm domain onboarding SOP owner and process

Exit criteria:

- [x] Architecture decisions documented and approved
- [x] No unresolved blockers for schema migration

## Phase 1 - Data Foundation (AWS RDS PostgreSQL)

Goal: establish tenant identity and hard data boundaries.

Kickoff artifacts:

- `backend-rc/migrations/1779000000000_phase1_tenant-foundation.js`
- `PHASE1_LOCAL_TO_RDS_RUNBOOK.md`

- [x] Create `tenants` table
- [x] Create `tenant_domains` table
- [x] Create `user_tenant_roles` table
- [x] Create `tenant_modules` table
- [x] Create `tenant_features` table
- [x] Add `tenant_id` to tenant-owned feature tables
- [x] Add unique constraint for active domains
- [x] Add tenant-scoped indexes for high-volume reads
- [x] Add migration rollback scripts/tests

Exit criteria:

- [x] Two test tenants can coexist with no data overlap
- [x] Migrations run cleanly in dev and staging-equivalent shadow DB (dedicated staging DB still pending)

## Phase 2 - Tenant Context and Access Control

Goal: enforce tenant and permission checks on every request path.

Kickoff progress (2026-03-23):

- [x] Phase 2 foundation shipped in `backend-rc` for initial slice (`/api/pages`, `/api/site-settings`)
- [x] Expanded middleware and tenant scoping to additional content routes (`/api/blogs`, `/api/services`, `/api/business-listings`, `/api/products`, `/api/testimonials`, `/api/team-members`, `/api/faq`, `/api/page-images`, `/api/seo-metadata`)
- [x] Expanded middleware and tenant scoping to user/content infra routes (`/api/users`, `/api/assets`, `/api/google-tokens`)
- [x] Expanded same middleware pattern to remaining protected integration routes (`/api/stripe`, `/api/google`, `/api/agency-google-token`)
- [x] Finalized tenant model for `/api/images` (added `image.tenant_id`, tenant-scoped route enforcement, migration `1779100000000_add-image-tenant-scope`)
- [x] Backfill/cleanup remaining legacy images with null `tenant_id` (deterministic + timeline fallback cleanup applied; local now 0/17 unresolved)

- [x] Implement host -> tenant resolution middleware
- [x] Attach `tenantId` to request context
- [x] Reject unknown/inactive domains
- [x] Implement membership + role authorization middleware
- [x] Implement module/feature gate middleware
- [x] Add request logging with tenant context

Exit criteria:

- [x] Cross-tenant access attempts are blocked and logged
- [x] Role checks are enforced on all protected endpoints

## Phase 3 - Vertical Slice Migration (First End-to-End)

Goal: prove tenant isolation through one full product path.

Recommended first slice: Page Manager + Site Settings + Public Site Render.

- [x] Migrate page create/update to tenant scope
- [x] Migrate site settings read/write to tenant scope
- [x] Migrate site render route to domain tenant resolution
- [x] Add regression tests for tenant separation

Exit criteria:

- [x] Admin edits in tenant A never affect tenant B
- [x] Hostname switch changes rendered tenant correctly

## Phase 4 - Existing Feature Migration (No Regression)

Goal: migrate all current features under strict tenant rules.

- [x] Google Business integration tenant-scoped tokens
- [x] AI content pipeline tenant usage limits
- [x] S3 asset manager tenant key prefix enforcement
- [x] Calendar module tenant scoping and module gating
- [x] Auth flows mapped to tenant memberships and roles

Exit criteria:

- [ ] All existing features work with tenant scoping
- [ ] No severity-1 regression introduced by migration

## Phase 5 - Domains, Email, and Payments

Goal: complete per-client operational capabilities.

- [ ] Domain onboarding workflow (pending -> active)
- [ ] Domain conflict detection and uniqueness checks
- [ ] Per-tenant email sender profile setup
- [ ] SPF/DKIM verification tracking
- [ ] Lead notification routing per tenant
- [ ] Stripe Connect onboarding per tenant
- [ ] Tenant-scoped checkout session creation
- [ ] Idempotent webhook processing by tenant/account

Exit criteria:

- [ ] New tenant can go live with domain, email, and payments
- [ ] Payment and email events are fully tenant-attributed

## Phase 6 - Packaging, Monetization, and Access Phases

Goal: launch plan tiers and add-on controls.

- [ ] Define plan phases (base + expanded phases)
- [ ] Define add-on catalog and pricing linkage
- [ ] Enforce entitlement checks in API and UI
- [ ] Add upgrade/downgrade operational flow
- [ ] Add usage counters for premium features

Exit criteria:

- [ ] Plan and add-on entitlements enforced consistently
- [ ] Billing and feature access remain in sync

## Phase 7 - Reliability and Observability

Goal: protect critical flows at scale.

Critical flows: login, payments, appointments/calendars, lead emails.

- [ ] Add SLO targets for each critical flow
- [ ] Add alerting for payment webhook failures
- [ ] Add alerting for booking creation failures
- [ ] Add retry queue for outbound email/SMS
- [ ] Add dead-letter handling and replay tooling
- [ ] Add tenant-level error and latency dashboards

Exit criteria:

- [ ] On-call can detect and recover from critical failures quickly
- [ ] Tenant impact is visible in monitoring

## Phase 8 - Onboarding and Controlled Self-Service

Goal: operationalize scaling and handoff.

- [ ] Internal tenant onboarding wizard
- [ ] Business-type preset templates
- [ ] Controlled client content editing permissions
- [ ] Runbook for support/escalation per feature module
- [ ] Launch checklist for each new tenant

Exit criteria:

- [ ] Internal team can onboard clients repeatably
- [ ] Clients can edit allowed content safely

## Completion Gate (Program Done)

- [ ] All phases exit criteria met
- [ ] 3+ tenants running in production with no cross-tenant incidents
- [ ] Critical flow error budgets stable for 30 days
- [ ] Architecture and ops documentation updated
