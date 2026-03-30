# Multi-Tenancy Architecture Draft

Date: 2026-03-23 (initial), 2026-03-29 (Sections 3.2, 6, 6.1, 8 updated)
Owner: RD Tech Bridge
Status: Draft v3

Execution tracker: see `MULTI_TENANCY_PHASE_CHECKLIST.md`.
Phase 1 execution runbook: see `docs/archive/phases/PHASE1_LOCAL_TO_RDS_RUNBOOK.md`.

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

Each request resolves tenant through the `tenantContext` middleware in Express.

Resolution order:

1. Read host from `x-tenant-domain` → `x-forwarded-host` → `Host` header.
2. **Localhost bypass** — when the resolved host is `localhost` / `127.0.0.1` / `::1`, accept `x-tenant-id` header directly (development only).
3. **Domain lookup** — match host against `tenant_domains` table (`LOWER(domain)`). Reject inactive domains or inactive tenants.
4. **Header fallback** — if domain lookup returns no match, accept `x-tenant-id` header. This covers server-to-server calls where the `Host` header is the API hostname (e.g. `api.rctechbridge.com`), not a tenant domain. Downstream `requireTenantMembership` still enforces that the authenticated user has permission for the specified tenant.
5. Attach `req.tenantId` and `req.tenant` to request context.
6. Require tenant-scoped query path for all tenant-owned data.

Middleware chain for all tenant-scoped routes:

```
authMiddleware → tenantContext → requireTenantMembership → route handler
```

Public site resolution (unauthenticated visitors):

1. Next.js middleware reads incoming hostname.
2. Matches against `RC_TEMPORARY_HOST_SUFFIXES` (`.rctechbridge.com`, `.preview.rctechbridge.com`, `.vercel.app`) or custom domains.
3. Calls `POST /api/public/site/context` with the hostname to resolve `tenantId` and `websiteId`.
4. Rewrites the request to `/sites/{websiteId}/{path}` for rendering.

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
- `professional_email` (add-on — Google Workspace on tenant domain)
- `ai_email_agent` (add-on — inbox reading, draft replies, calendar sync)
- `ai_email_agent_pro` (premium add-on — 24/7 autonomous agent via Workspace delegation)
- `custom_ai_agent` (premium add-on)

## 6) Email Architecture (Per Client)

Requirement: each client has different emails.

### 6.1 Three Email Layers

| Layer | Purpose | Provider | Cost |
|-------|---------|----------|------|
| Platform internal | RC team comms, support, ops | Google Workspace (`rctechbridge.com`) | Existing |
| Transactional/notification | Lead alerts, booking confirmations, invoices, estimates | Resend (per-tenant sender profiles) | Resend Pro $20/mo |
| Tenant business inbox | Owner reads/replies to email, daily business comms | BYOE (default) or Google Workspace add-on | $0 default, $15–20/user/mo add-on |

Layer 1 and 2 are platform infrastructure. Layer 3 is tenant-owned.

### 6.2 Resend — Transactional Email Engine

Provider: Resend Pro (one shared account, unlimited verified sending domains).

Plan requirements:

| Resend Plan | Domains | Emails/month | Rate limit | Required for |
|-------------|---------|-------------|------------|-------------|
| Free | 1 | 3,000 | 2/s | Dev/test only |
| **Pro ($20/mo)** | **Unlimited** | **50,000** | **10/s** | **Production — required** |
| Enterprise | Unlimited | Custom | Custom | 500+ tenants or >100k/month |

Resend Pro is required before onboarding a second tenant. No code changes needed — the existing `RESEND_API_KEY` stays the same after upgrading.

#### 6.2.1 Implementation Status (Updated 2026-03-29)

✅ **Complete**:
- Shared Resend client singleton at `src/lib/resend-client.ts`
- Per-tenant sending domain management via `src/lib/resend-domains.ts` wrapper
- Auto-creates `mg.{domain}` on domain onboarding (`POST /api/domains/onboard`)
- Frontend site-settings UI exposes `Setup Sending Domain` and `Verify Mail DNS` buttons on domain cards
- DNS records panel merges Vercel + Resend records (`GET /api/domains/dns-info`)
- SPF/DKIM verification via direct Resend API fallback (`POST /api/email/profile/verify`)
- Dedicated Resend domain routes: `POST /api/resend-domains/create`, `POST /api/resend-domains/verify`, `GET /api/resend-domains/status`
- On-mount hydration: site-settings page queries Resend API per custom domain to restore status badges on page load

#### 6.2.2 Future Enhancement — Persist Resend State in DB (Option B)

Currently Resend domain state (domain ID, verification status) is hydrated on each page load via the Resend API. This works well for a small number of tenants but makes one API call per custom domain per page view.

When scaling beyond ~50 tenants with custom domains, migrate to persisted state:

```sql
ALTER TABLE tenant_domains
  ADD COLUMN resend_domain_id TEXT,
  ADD COLUMN resend_status TEXT DEFAULT 'none';
```

Backend changes required:
- Update domain onboard handler to persist `resend_domain_id` and `resend_status` when the Resend subdomain is created.
- Update `GET /domains/status` response to include `resend_domain_id` and `resend_status` per domain.
- Add a periodic job or webhook handler that syncs Resend verification status back to DB.
- Remove on-mount Resend API hydration from the frontend once the backend returns the data.

This is not needed until the per-page-load Resend API calls become a performance concern.

### 6.3 Per-Tenant Email Profile (Existing)

Store per-tenant email profile:

- `from_name`
- `from_email`
- `reply_to`
- `sending_domain`
- `dkim_verified`
- `spf_verified`

Store lead notification targets per tenant:

- `lead_notification_emails[]`
- optional escalation rules

Use template IDs shared globally, inject tenant branding/content at send time.

### 6.4 Tenant Email Scenarios

| Scenario | Website URL | Outbound sender (Resend) | Tenant inbox |
|----------|------------|-------------------------|--------------|
| No domain | `slug.rctechbridge.com` | `hello@mg.rctechbridge-mail.com` | Their personal Gmail/Outlook |
| Has domain | `acmeelectric.com` | `hello@acmeelectric.com` via `mg.acmeelectric.com` | Their personal Gmail/Outlook |
| Domain + email add-on | `acmeelectric.com` | `hello@acmeelectric.com` via `mg.acmeelectric.com` | `owner@acmeelectric.com` (Google Workspace) |

Tenants without a domain are fully functional on the platform sender. Branded sending activates only after the tenant's domain is verified and SPF/DKIM pass.

### 6.5 Outbound Email Types By Module

| Module | Email Types | Template prefix | Trigger |
|--------|-----------|----------------|--------|
| Lead Capture | New lead alert to tenant, auto-reply to customer | `lead_*` | Form submission |
| Appointments/Calendar | Confirmation, reminder (24h), cancellation, reschedule | `appointment_*` | Booking action |
| Estimates | Estimate sent, approved/declined | `estimate_*` | Tenant creates estimate |
| Invoices | Invoice sent, payment received, overdue | `invoice_*` | Invoice or payment event |
| E-Commerce/Shop | Order confirmation, shipping, delivery | `order_*` | Purchase on tenant site |
| Contracts | Sent for signature, signed confirmation | `contract_*` | Tenant sends contract |
| Reviews | Review request after job | `review_request` | Job marked complete |
| Follow-ups | Drip sequence (day 1, 3, 7) | `followup_*` | Automated schedule |

All types share the same send pipeline:

```
Trigger → resolve tenant email profile → pick template → inject branding → Resend API → log → on failure → retry → DLQ
```

### 6.6 DNS Coexistence (Per Tenant Domain)

When a tenant has their own domain, website, inbound email, and outbound transactional email coexist on different DNS record types:

```
acmeelectric.com
├── A      → 76.76.21.21              (Vercel — website)
├── CNAME  → cname.vercel-dns.com     (www redirect)
├── MX     → ASPMX.L.GOOGLE.COM      (Google Workspace — only if email add-on)
├── TXT    → v=spf1 include:_spf.google.com include:amazonses.com ~all
└── mg.acmeelectric.com
    ├── CNAME / TXT → Resend SPF/DKIM  (outbound transactional)
```

MX records are only added when the tenant purchases the Professional Email add-on.

### 6.7 Professional Email Add-on (Google Workspace)

Add-on key: `professional_email`.

Provisioning model: manual initially (Phase 1), automated via Admin SDK later.

When a tenant purchases the add-on:

1. RC provisions Google Workspace for the tenant's domain in Google Admin Console.
2. RC creates mailboxes as agreed (owner, office, etc.).
3. MX records are added to the tenant's DNS alongside existing Vercel + Resend records.
4. Tenant receives Gmail credentials and can read/reply from professional addresses.

Tenant email config table:

```sql
tenant_email_config (
  id                    BIGSERIAL PRIMARY KEY,
  tenant_id             BIGINT NOT NULL REFERENCES tenants(id),
  provider              TEXT NOT NULL DEFAULT 'none',  -- 'none', 'google_workspace'
  workspace_customer_id TEXT,
  users_provisioned     INT DEFAULT 0,
  mx_verified           BOOLEAN DEFAULT false,
  provisioned_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
)
```

Pricing: pass-through + margin (Google costs ~$7–14/user/month, charge tenant $15–20/user/month).

### 6.8 Scaling Safeguards

Required before 50 tenants:

1. **Per-tenant send tracking** — `tenant_email_sends` ledger table for cost attribution and abuse detection.
2. **Backend send queue** — move Resend calls from inline API route to a backend queue worker that drains at safe rate (8/s).
3. **Per-tenant daily send cap** — default 100/day per tenant, configurable via `tenant_features`.

Required before 100 tenants:

4. **Bounce/complaint webhooks** — register Resend webhook, route to backend, auto-suppress bad addresses per tenant.
5. **Domain verification health cron** — periodic check of all active tenant sending domains via Resend API.

When to evaluate migration to AWS SES: 500+ tenants or sustained >100k emails/month.

Operational notes:

- New tenant onboarding must include DNS verification checklist (SPF, DKIM, return-path if needed).
- If a client cannot verify domain, fall back to platform sender domain with tenant-specific reply-to.

## 6.9 AI Email Agent Architecture

### Tiered Model

| Tier | Name | Access Method | Capabilities | Add-on key |
|------|------|--------------|-------------|------------|
| Base | AI Lite | OAuth (BYOE) | Read inbox, draft replies, organize, calendar sync | `ai_email_agent` |
| Premium | AI Pro | Google Workspace domain-wide delegation | All of Lite + 24/7 autonomous operation, multi-user, auto-triage, auto-follow-up | `ai_email_agent_pro` |

### Base Tier — OAuth (BYOE + AI Lite)

Tenant connects their existing Gmail or Outlook via OAuth. AI agent features run when the token is valid.

Flow:

1. Tenant clicks "Connect Email" in tenant settings.
2. App redirects to Google/Microsoft OAuth consent screen.
3. Tenant approves requested scopes.
4. Callback stores tokens in `tenant_oauth_tokens`.
5. AI agent uses tokens to access mailbox and calendar APIs.

Google scopes:

- `https://www.googleapis.com/auth/gmail.modify`
- `https://www.googleapis.com/auth/calendar.events`

Microsoft Graph scopes:

- `Mail.ReadWrite`
- `Calendars.ReadWrite`

Limitations:

- Token can be revoked by user at any time.
- Refresh tokens may expire after 6 months of inactivity.
- Each user must individually consent.
- AI stops working if token breaks until user re-authenticates.

### Premium Tier — Managed Workspace + AI Pro

RC provisions Google Workspace for the tenant's domain. Domain-wide delegation grants the platform service account access to all tenant mailboxes.

Flow:

1. Tenant purchases Professional Email + AI Pro add-on.
2. RC provisions Google Workspace (manual Phase 1, automated later).
3. RC enables domain-wide delegation in Workspace admin.
4. Platform service account impersonates any `@tenantdomain.com` user.
5. AI agent operates 24/7 without tenant intervention.

Advantages over OAuth:

- Tokens never expire (service account, controlled by RC).
- No per-user consent needed.
- New employees auto-covered when account is created.
- RC can centrally revoke access on offboarding.
- Push notifications (Gmail Pub/Sub) are reliable.

### AI Agent Capabilities

| Incoming email pattern | AI action | App result |
|----------------------|-----------|------------|
| Request for quote/estimate | Classify as lead, extract details | Create lead record, draft reply with availability |
| Appointment confirmation | Classify as scheduling | Add to calendar, send confirmation |
| Signed contract returned | Classify as contract response | Update contract status, notify tenant |
| Customer service inquiry | Classify as inquiry | Draft reply using app data (order status, etc.) |
| Payment notification | Classify as payment | Match to invoice, update status |
| Spam / newsletter | Classify as noise | Auto-archive |

### OAuth Token Data Model

```sql
tenant_oauth_tokens (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
  user_id         BIGINT NOT NULL REFERENCES users(id),
  provider        TEXT NOT NULL,           -- 'google', 'microsoft'
  scopes          TEXT[] NOT NULL,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  expires_at      TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'active',  -- 'active', 'revoked', 'expired'
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

This table is separate from the existing Google Business OAuth tokens (`agency_google_token`). Gmail/Calendar OAuth uses the same Google Cloud OAuth client with different scopes.

### Auth Isolation

Gmail OAuth does not affect the platform auth system:

- **App login**: JWT issued by Express backend (unchanged).
- **Tenant membership**: JWT payload `memberships[]` checked by `requireTenantMembership` (unchanged).
- **Google Business OAuth**: Existing flow, scopes `business.manage`, tokens in `agency_google_token` (unchanged).
- **Gmail/Calendar OAuth**: New flow, scopes `gmail.modify` + `calendar.events`, tokens in `tenant_oauth_tokens`.

These are four independent auth layers that never cross paths.

### Inbound Reply Strategy (Phased)

Closing the loop on customer replies coming back into the app:

- **Phase 1 (now)**: Manual notes — tenant logs "customer approved via email" in CRM.
- **Phase 2**: Gmail API integration — app pulls email threads for known contacts into CRM view.
- **Phase 3**: Full two-way — tenant reads and replies inside the app.

### API Routes (Planned)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/google/gmail-callback` | GET | Gmail/Calendar OAuth callback |
| `/api/auth/microsoft/callback` | GET | Microsoft Graph OAuth callback |
| `/api/tenant-email-oauth/status` | GET | Check OAuth connection status for tenant |
| `/api/tenant-email-oauth/disconnect` | POST | Revoke and delete OAuth tokens |
| `/api/ai-agent/inbox/summary` | GET | AI-generated inbox summary for tenant |
| `/api/ai-agent/drafts` | GET/POST | AI-generated draft replies |

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

### 8.1 Platform Domain Layout

| Domain | Purpose |
|--------|---------|
| `*.rctechbridge.com` | Wildcard for auto-assigned tenant preview URLs |
| `{slug}.rctechbridge.com` | Default preview URL created at tenant onboarding |
| Custom domain (e.g. `www.client.com`) | Optional; added via admin UI |
| `api.rctechbridge.com` | Backend API (Express) |

All domains resolve to one Vercel project: `tech-bridge-front` (`prj_zgqXS8iRrkwRbKNZvqo51xWFOga3`).

### 8.2 Preview URLs (No Custom Domain Required)

When a tenant is created without a custom domain, the backend auto-assigns `{slug}.rctechbridge.com`:

1. `POST /api/tenants` inserts a row into `tenant_domains` with `is_primary = true`, `status = 'active'`.
2. The wildcard `*.rctechbridge.com` on Vercel auto-verifies all subdomains — no DNS setup needed.
3. The tenant's public site is immediately reachable at `https://{slug}.rctechbridge.com`.

Env var: `RC_TEMPORARY_DOMAIN_SUFFIX=rctechbridge.com` (backend).

### 8.3 Custom Domain Onboarding (Vercel API)

Integration uses the Vercel REST API v9/v10 (`api.vercel.com`). Backend wrapper: `lib/vercelDomains.js`.

Required env vars:

- `VERCEL_API_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID` (optional, for team-scoped projects)

Onboarding flow:

1. Admin enters custom domain in Site Settings UI.
2. `POST /api/domains/onboard` → backend adds domain to Vercel project (`POST /v10/projects/{projectId}/domains`), adds www redirect variant for apex domains, inserts `tenant_domains` row with `status = 'pending'`.
3. UI displays DNS records (TXT for verification, A/CNAME for routing) from Vercel API response.
4. Admin or client configures DNS at their registrar.
5. `POST /api/domains/verify` → backend calls Vercel verify endpoint, updates `tenant_domains.status` to `active` on success or `verification_failed` on failure.
6. Once active, tenant traffic routes to the site via Vercel edge.

### 8.4 Domain API Routes

Frontend proxy routes (Next.js `src/app/api/domains/`):

| Route | Method | Backend Target | Purpose |
|-------|--------|----------------|---------|
| `/api/domains/status` | GET | `/domains/status?website_id={id}` | List domains for tenant |
| `/api/domains/onboard` | POST | `/domains/onboard` | Add domain to Vercel + DB |
| `/api/domains/verify` | POST | `/domains/verify` | Trigger Vercel DNS verification |
| `/api/domains/dns-info` | GET | `/domains/dns-info?domain={d}` | Fetch current DNS records |
| `/api/domains/[domainId]` | DELETE | `/domains/{domainId}` | Remove domain from Vercel + DB |

Resend domain management routes (self-contained, no backend proxy):

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/resend-domains/create` | POST | Create Resend sending subdomain (`mg.{domain}`) |
| `/api/resend-domains/verify` | POST | Trigger SPF/DKIM verification via Resend API |
| `/api/resend-domains/status` | GET | Check Resend domain verification status |

Hybrid routes (backend proxy + Resend API):

| Route | Resend Integration |
|-------|--------------------|
| `/api/domains/onboard` | Auto-creates `mg.{domain}` in Resend after Vercel domain add |
| `/api/domains/dns-info` | Merges Resend DNS records alongside Vercel records |
| `/api/email/profile/verify` | Falls back to direct Resend API verification when backend unavailable |

All proxy routes forward `Authorization` and `x-tenant-id` headers using `fetchFirstSuccessfulCandidate` from `lib/proxy-candidates`.

Backend routes (`routes/domains.js`) are protected by:

```
authMiddleware → tenantContext → requireTenantMembership({ anyOfRoles: adminRoles })
```

### 8.5 Domain Data Model

```sql
tenant_domains (
  id          BIGINT PRIMARY KEY,
  tenant_id   BIGINT NOT NULL REFERENCES tenants(id),
  domain      TEXT   NOT NULL,
  is_primary  BOOLEAN DEFAULT false,
  status      TEXT   CHECK (status IN ('pending','active','inactive','verification_failed')),
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
)
```

Constraints: unique active domain across all tenants.

### 8.6 Operational Guardrails

- Domain uniqueness constraint prevents duplicate claims.
- `www.` redirect variant is automatically added/removed for apex domains.
- Removing a domain deletes from both Vercel project and `tenant_domains`.
- Preview URLs (`*.rctechbridge.com`) should never be deleted — they serve as fallback.
- Health check: `GET /api/public/site/context` with the domain hostname should return tenant context.

## 8.7 Tenant Suspension and Offboarding

### Suspension Policy

The `tenants.status` field supports three states: `active`, `suspended`, `inactive`.

The `suspension_reason` column distinguishes the cause:

| Reason | Trigger | Admin Dashboard | Public Website |
|--------|---------|----------------|----------------|
| `billing` | Payment past due / grace expired | Read-only | Live (static pages, no checkout/forms) |
| `tos` | Terms of service / legal violation | Blocked | Down ("site no longer active") |
| `manual` | Admin chose to pause service | Blocked | Down ("site no longer active") |

Billing-driven suspension relies on the access matrix in `lib/tenantPolicy.js`:

- `past_due` with grace period: full access for 7 days (`PAST_DUE_GRACE_DAYS`).
- `unpaid` / grace expired: read-only admin, billing features disabled.
- `canceled`: read-only until period end, then restricted.

### Offboarding Flow

Endpoint: `POST /api/tenants/:tenantId/offboard` (admin only).

Orchestrates:

1. Remove all **custom domains** from the Vercel project so the client can point them elsewhere.
2. Mark preview domain (`{slug}.rctechbridge.com`) as `inactive` (kept for audit trail).
3. **Deactivate all member roles** (`user_tenant_roles.status = 'inactive'`).
4. Set tenant `status = 'inactive'`, `offboarded_at = NOW()`.
5. Set `data_retention_expires_at` to 90 days from offboard date.

### Public Site Behavior After Offboard

- `tenantContext` middleware detects inactive tenant and returns `403 { code: "TENANT_OFFBOARDED" }`.
- Next.js middleware intercepts the 403 and rewrites to `/sites/deactivated` — a static "site no longer active" page.
- The preview URL (`{slug}.rctechbridge.com`) stays in DNS (wildcard) but renders the deactivated page.

### Data Retention

Tenant data is preserved for 90 days after offboard (`DATA_RETENTION_DAYS = 90`).

Columns:

```sql
tenants.suspension_reason  TEXT CHECK (IN 'billing', 'tos', 'manual')
tenants.offboarded_at      TIMESTAMPTZ
tenants.data_retention_expires_at  TIMESTAMPTZ
```

A scheduled purge job (not yet implemented) will hard-delete tenant data after `data_retention_expires_at`.
The `ON DELETE CASCADE` foreign keys on `tenant_domains` and `user_tenant_roles` will cascade.
The `website` table uses `ON DELETE SET NULL` to orphan the record.

### Data Export (Phase 8 — planned)

Before offboarding, an admin should be able to export:

- Pages (HTML/JSON)
- Images / assets (S3 key list or zip)
- Contacts / leads
- Billing history

This is tracked as a Phase 8 feature.

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
- Upgrade Resend to Pro for unlimited tenant sending domains.

## Phase 3: Feature Migration

- Move each current feature to strict tenant context.
- Add usage tracking and limits for premium add-ons.
- Add internal onboarding wizard with business-type presets.

## Phase 4: Email Scaling + AI Agent Foundation

- Add `tenant_email_sends` tracking table.
- Move email sends to backend queue worker (rate-limit safe).
- Add per-tenant daily send caps.
- Register Resend bounce/complaint webhooks.
- Build Gmail OAuth flow ("Connect Email" in tenant settings).
- Build Microsoft Graph OAuth flow for Outlook users.
- Add `tenant_oauth_tokens` table.

## Phase 5: AI Email Agent

- Build email read/classify pipeline using AI.
- Build draft-reply generation with tenant context and templates.
- Add calendar sync (Google Calendar API, Microsoft Graph).
- Build inbox summary and triage UI in tenant dashboard.
- Add `ai_email_agent` add-on to feature/module system.

## Phase 6: Professional Email + AI Pro

- Build Google Workspace manual provisioning workflow.
- Add `tenant_email_config` table and admin UI.
- Add `professional_email` add-on.
- Implement domain-wide delegation for Workspace tenants.
- Launch `ai_email_agent_pro` with 24/7 autonomous operation.
- Domain verification health cron for all active sending domains.

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
5. ~~Define domain onboarding SOP for operations.~~ → Done. See Section 8 and `TENANT_FEATURE_PLAYBOOK_DOMAINS_EMAIL.md`.

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
