# Multi-Tenancy Architecture Draft

Date: 2026-03-23
Owner: RC Tech Bridge
Status: Draft v1

Execution tracker: see `MULTI_TENANCY_PHASE_CHECKLIST.md`.
Phase 1 execution runbook: see `PHASE1_LOCAL_TO_RDS_RUNBOOK.md`.

## 1) Product Goal

Build one scalable platform that supports hundreds of client businesses from one core codebase, while preserving:

- Client-specific domain and branding
- Client-specific permissions and feature access
- Client-specific email routing
- Client-specific payment setup
- Existing feature parity during migration

## 2) Key Business Constraints

- Internal onboarding first, then controlled client self-service
- One admin user can manage multiple client tenants
- Different business types require different modules
- Add-on model is required for monetization
- Enterprise clients may later receive dedicated deployments

## 3) Recommended Platform Shape

## 3.1 Core Model

- One frontend repo (this repo)
- One backend repo (Express)
- One shared production deployment per environment (dev/staging/prod)
- Multi-tenant data model with strict tenant scoping in backend

## 3.2 Tenant Resolution

Each request resolves tenant by host name:

1. Read request host.
2. Match host in `tenant_domains`.
3. Attach `tenantId` to request context.
4. Require tenant-scoped query path for all tenant-owned data.

## 4) Data and Access Model

Database platform: AWS RDS for PostgreSQL.

RDS-specific baseline recommendations:

- Keep one primary database cluster per environment (dev/staging/prod).
- Use connection pooling (pgBouncer or managed equivalent) to protect Postgres connection limits.
- Enable automated backups and point-in-time recovery.
- Enable Performance Insights and slow query logging for tenant-heavy query analysis.
- Add composite indexes with `tenant_id` as leading key where query patterns are tenant-scoped.

## 4.1 Core Tables

- `tenants`
- `tenant_domains`
- `users`
- `user_tenant_roles`
- `subscriptions`
- `subscription_addons`
- `tenant_features`
- `tenant_modules`

## 4.2 Roles

Suggested roles:

- `platform_admin`: RC internal super-admin
- `tenant_owner`: top-level client owner
- `tenant_manager`: operations/admin tasks
- `tenant_editor`: content edits only
- `tenant_viewer`: read-only

Authorization check order:

1. Authenticated user?
2. Has role in tenant?
3. Feature/module enabled for tenant?
4. Action allowed for role?

## 5) Business Types and Module Strategy

Business type should drive default module bundle, not separate repos.

Suggested `business_type` values:

- `lead_gen_services`
- `appointments`
- `ecommerce`
- `reservations`
- `hybrid_local`

Suggested modules:

- `website_core` (required)
- `seo_content` (required)
- `lead_capture` (usually required)
- `calendar_appointments` (optional)
- `checkout_ecommerce` (optional)
- `reservations` (optional)
- `google_business_management` (add-on)
- `sms_leads_and_comms` (add-on)
- `google_ads_optimization` (add-on)
- `custom_ai_agent` (premium add-on)

## 6) Email Architecture (Per Client)

Requirement: each client has different emails.

Recommended approach:

1. Use one email provider account that supports multiple verified sending domains.
2. Store per-tenant email profile:
   - `from_name`
   - `from_email`
   - `reply_to`
   - `sending_domain`
   - `dkim_verified`
   - `spf_verified`
3. Store lead notification targets per tenant:
   - `lead_notification_emails[]`
   - optional escalation rules
4. Use template IDs shared globally, inject tenant branding/content at send time.
5. Enforce per-tenant suppression/bounce handling.

Operational notes:

- New tenant onboarding must include DNS verification checklist (SPF, DKIM, return-path if needed).
- If a client cannot verify domain, fall back to platform sender domain with tenant-specific reply-to.

## 7) Stripe Architecture (Per Client)

Requirement: each client has different Stripe payments.

Recommended default: Stripe Connect (one platform, many connected accounts).

Why:

- Keeps one codebase and one payments integration.
- Supports clients owning their own Stripe accounts.
- Supports platform fees for add-ons/services.

Tenant payment fields:

- `stripe_connected_account_id`
- `charges_enabled`
- `payouts_enabled`
- `onboarding_completed_at`
- `default_currency`

Checkout flow pattern:

1. Resolve tenant.
2. Create Checkout Session on tenant connected account.
3. Record tenant + account IDs in metadata.
4. Process webhooks idempotently and tenant-scoped.

Webhook pattern:

- One webhook endpoint can receive events across connected accounts.
- Verify signature and map event to tenant via account ID and metadata.
- Use idempotency/event table to prevent double-processing.

## 8) Vercel Domains for Every Client

Requirement: custom domain for each client.

Recommended pattern:

1. Main app runs on one Vercel project.
2. Configure wildcard platform domain (example: `*.yourplatform.com`) for testing/preview tenant routing.
3. Add each client custom domain to the same Vercel project.
4. Store domain in `tenant_domains` with verification state.
5. Route requests by host header to tenant.

Domain onboarding flow:

1. Admin enters client domain.
2. System creates domain mapping record as `pending`.
3. Show required DNS records to client/internal ops.
4. Verify DNS + SSL provisioning status.
5. Mark domain `active` and enable tenant traffic.

Important operational guardrails:

- Domain uniqueness constraint across tenants.
- Automatic conflict detection (already claimed domain).
- Health check endpoint per domain after activation.

## 9) Existing Feature Migration (No Regression)

All current features must migrate into tenant-scoped modules.

Feature map:

- Multi-tenant CMS and ISR pages: keep, enforce domain -> tenant routing.
- Google Business integration: migrate to tenant module with per-tenant OAuth tokens.
- AI content pipeline: keep as shared service with per-tenant usage limits.
- Page Manager + MDX + SEO metadata: keep, tenant-scoped page ownership.
- S3 asset manager: keep, tenant-scoped key prefixes and access checks.
- Calendar: keep as module enabled only for relevant business types.
- Auth: keep backend-managed auth; add role + tenant membership checks.

## 10) Rollout Plan

## Phase 1: Foundations

- Add tenant/domain/membership/feature schema.
- Implement host -> tenant middleware.
- Add authorization middleware for tenant membership and role checks.
- Add feature/module gate middleware.

## Phase 2: Payments + Emails + Domains

- Integrate Stripe Connect per tenant.
- Add per-tenant email profiles and lead routing.
- Implement domain onboarding workflow and verification status.

## Phase 3: Feature Migration

- Move each current feature to strict tenant context.
- Add usage tracking and limits for premium add-ons.
- Add internal onboarding wizard with business-type presets.

## 11) Reliability Targets For Critical Flows

Critical flows:

- Login
- Payments
- Appointments/Calendars
- Lead notification emails

Minimum safeguards:

- Structured logs with tenant ID on every request.
- Idempotent webhook handlers.
- Retry queue for outbound emails/SMS.
- Alerting on payment webhook failures and booking failures.

## 12) Suggested Defaults When Unknown

- Data isolation: shared DB with strict `tenant_id` filtering.
- Deployment model: shared app for standard clients.
- Enterprise model: dedicated deployment only on explicit trigger.
- Onboarding model: internal-only now, client self-service later.

## 13) Enterprise Carve-Out Triggers

Move tenant to dedicated deployment only if one or more apply:

- Contract requires data or infra isolation.
- Dedicated SLA/release cadence required.
- Custom logic too large for shared module system.
- Security/compliance requirements demand isolation.

## 14) Immediate Next Decisions

1. Confirm enum values for `business_type` and `module_key`.
2. Confirm role capability matrix by role.
3. Decide first 3 paid add-ons for launch packaging.
4. Decide email provider and Stripe Connect account type.
5. Define domain onboarding SOP for operations.

## 15) What To Tackle First (Execution Order)

Start with tenant identity and data boundaries before Stripe/email/domains UI.

Week 1-2 implementation slice:

1. Backend schema foundation (AWS RDS)
   - Create `tenants`, `tenant_domains`, `user_tenant_roles`, `tenant_modules`, `tenant_features`.
   - Add `tenant_id` to tenant-owned tables used by current features.
   - Add constraints and indexes:
     - unique (`tenant_id`, business key) where appropriate
     - unique domain in `tenant_domains`
     - index (`tenant_id`, `created_at`) on high-volume entities
2. Tenant resolution middleware (Express)
   - Resolve host -> domain record -> `tenantId`.
   - Attach `tenantId` to request context.
   - Reject unknown/inactive domain with clear error response.
3. Authorization and feature gates
   - Add membership/role middleware.
   - Add module/feature entitlement middleware.
4. Migrate one vertical slice end-to-end first
   - Recommended first slice: page manager + site settings + site render route.
   - Goal: prove tenant isolation from admin edit through public site render.

Definition of done for first slice:

- Two tenants on same deployment cannot read/write each other's data.
- Hostname switch cleanly changes tenant context.
- Existing page publishing flow still works with tenant scoping.

After first slice is stable, do in this order:

1. Google Business module
2. S3 asset manager
3. Calendar/appointments module
4. Payments (Stripe Connect)
5. Email + SMS lead notifications