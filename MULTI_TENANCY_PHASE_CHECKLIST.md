# Multi-Tenancy Phase Checklist

Date: 2026-03-23
Status: Living checklist

Use this checklist as the implementation tracker from kickoff to completion.

## Phase 0 - Alignment and Scope Lock

Goal: freeze architecture decisions before migrations start.

Decision log: see `docs/archive/phases/PHASE0_DECISION_LOG.md`.

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
- `docs/archive/phases/PHASE1_LOCAL_TO_RDS_RUNBOOK.md`

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

- [x] All existing features work with tenant scoping
- [x] No severity-1 regression introduced by migration

## Phase 5 - Domains, Email, and Payments

Goal: complete per-client operational capabilities.

- [x] Domain onboarding workflow (pending -> active)
- [x] Domain conflict detection and uniqueness checks
- [x] Per-tenant email sender profile setup
- [x] SPF/DKIM verification tracking
- [x] Lead notification routing per tenant
- [x] Stripe Connect onboarding per tenant
- [x] Tenant-scoped checkout session creation
- [x] Idempotent webhook processing by tenant/account

Exit criteria:

- [x] New tenant can go live with domain, email, and payments
- [x] Payment and email events are fully tenant-attributed

## Phase 6 - Packaging, Monetization, and Access Phases

Goal: launch plan tiers and add-on controls.

Kickoff artifacts:

- `docs/plans/phase6/PHASE6_ENTITLEMENT_MATRIX_DRAFT.md`
- `docs/plans/phase6/PHASE6_BILLING_ENTITLEMENT_SYNC_CONTRACT.md`
- `docs/plans/phase6/PHASE6_PACKAGING_PRICING_LINKAGE_DRAFT.md`
- `docs/plans/phase6/PHASE6_ENTITLEMENT_ENFORCEMENT_PLAN.md`

Kickoff progress (2026-03-23):

- [x] Phase 6 kickoff started (packaging/entitlements track opened)
- [x] Entitlement matrix draft (plans x modules x features x add-ons)
- [x] Billing-to-entitlement sync contract draft (source of truth + reconciliation)

Execution progress (2026-03-24):

- [x] Frontend baseline module-gated navigation shipped (Calendar/Google Business entitlement-aware sidebar filtering)
- [x] Entitlement enforcement execution plan drafted (backend + frontend rollout path)
- [x] Frontend route-level entitlement guards added for premium pages (Google Business + Calendar deep-link protection)
- [x] Frontend AI route guard added (Prompts/Chat GPT gated by custom AI module + feature)
- [x] Next.js API proxy passthrough hardened (preserve backend 401/402/403/409/429 denial semantics)
- [x] Backend premium route entitlement checks added in `backend-rc` (Google Business + agency token + Google token routes + eCommerce product routes)
- [x] Backend entitlement denial payloads standardized with machine-readable codes (module/feature missing or disabled)
- [x] Backend auth payload enriched with tenant memberships + enabled modules/features for active tenant context
- [x] Backend Stripe routes gated by eCommerce module/feature entitlement checks
- [x] Backend entitlement API added (`/api/entitlements/current`, `/api/entitlements/usage/consume`) with tenant membership + feature limit enforcement
- [x] Frontend AI content-agent now consumes backend entitlement usage (`ai.agent.generate`) before local fallback limiter
- [x] Backend Stripe plan-change operational endpoints added (`/subscriptions/:id/plan-change-preview`, `/subscriptions/:id/plan-change`) with change-request persistence and immediate/period-end behavior
- [x] Backend immediate plan-change flow now performs Stripe provider sync when resolvable (`price_` / `prod_`) before local apply
- [x] Backend scheduled apply worker added for due period-end requests (`npm run subscription-change:apply`)
- [x] Backend Google Business write actions now consume premium feature usage (`integrations.google_business.sync`) via tenant feature counters
- [x] Frontend shop management surface now route-gated by eCommerce module + feature entitlement
- [x] Backend entitlement usage telemetry table + event logging added (`tenant_feature_usage_event`) with reporting endpoint (`GET /api/entitlements/usage/report`)
- [x] Subscription change scheduling + alerting worker added (`npm run subscription-change:worker`, webhook alert support)
- [x] Phase 6 core verification script added (`npm run phase6:verify:core`) for usage telemetry and plan-change operational checks

- [x] Define plan phases (base + expanded phases) - draft v1
- [x] Define add-on catalog and pricing linkage - draft v1
- [x] Enforce entitlement checks in API and UI
- [x] Add upgrade/downgrade operational flow
- [x] Add usage counters for premium features

Exit criteria:

- [x] Plan and add-on entitlements enforced consistently
- [x] Billing and feature access remain in sync

## Phase 7 - Reliability and Observability

Goal: protect critical flows at scale.

Critical flows: login, payments, appointments/calendars, lead emails.

Kickoff progress (2026-03-24):

- [x] Phase 7 kickoff started (reliability + observability track opened)
- [x] Reliability/observability execution plan drafted (`docs/archive/phases/PHASE7_RELIABILITY_OBSERVABILITY_PLAN.md`)
- [x] Configure subscription change worker runtime env vars in deployment
	- [x] `SUBSCRIPTION_CHANGE_WORKER_INTERVAL_MS`
	- [x] `SUBSCRIPTION_CHANGE_ALERT_WEBHOOK_URL`
- [x] Define and document alert webhook target (Slack/Teams/PagerDuty) for subscription worker failures/skips

- [x] Add SLO targets for each critical flow
- [x] Add alerting for payment webhook failures
- [x] Add alerting for booking creation failures
- [x] Add retry queue for outbound email/SMS
- [x] Add dead-letter handling and replay tooling
- [x] Add tenant-level error and latency dashboards
- [x] Add Phase 7 incident runbook for alert triage and recovery

Exit criteria:

- [x] On-call can detect and recover from critical failures quickly
- [x] Tenant impact is visible in monitoring

## Phase 8 - Onboarding and Controlled Self-Service

Goal: operationalize scaling and handoff.

Kickoff progress (2026-03-24):

- [x] Phase 8 kickoff started (onboarding + self-service track opened)
- [x] Phase 8 execution plan drafted (`docs/archive/phases/PHASE8_ONBOARDING_SELF_SERVICE_PLAN.md`)

- [x] Internal tenant onboarding wizard
- [x] Business-type preset templates
- [x] Controlled client content editing permissions
- [x] Runbook for support/escalation per feature module
- [x] Launch checklist for each new tenant

Exit criteria:

- [x] Internal team can onboard clients repeatably
- [x] Clients can edit allowed content safely

## Completion Gate (Program Done)

- [ ] All phases exit criteria met
- [ ] 3+ tenants running in production with no cross-tenant incidents
- [ ] Critical flow error budgets stable for 30 days
- [ ] Architecture and ops documentation updated
