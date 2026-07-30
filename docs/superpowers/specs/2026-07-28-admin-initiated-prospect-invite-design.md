# Admin-Initiated Prospect Invite Flow

Date: 2026-07-28
Status: Draft, pending implementation planning
Repos affected: `admin-dashboard-rc` (frontend + intake pipeline), `backend-rc` (new endpoint, schema, webhook)

## Purpose

Let an internal admin start onboarding a prospect *before* a tenant is a paying, fully-configured client: pick the plan already agreed with the prospect, and send one invite that gives them an intake questionnaire, a Stripe subscription checkout link for that plan, and — once intake is complete — a calendar link to book the kickoff meeting. Replaces the "sales closes → admin creates a full tenant → booking link sent manually" pipeline in `2026-07-22-client-onboarding-process-design.md` with a product-native, admin-triggered version that doesn't require a full tenant record (with a live public site) to exist before the prospect has actually committed.

## Relationship to existing docs

- `2026-07-22-client-onboarding-process-design.md` currently assumes tenant creation happens *after* the sale closes, and that a booking link is sent manually via Google Calendar once intake + assets are reviewed. This spec moves tenant creation earlier (to the moment an admin sends the invite) and replaces the manual booking-link step with an automatic, intake-completion-triggered send. Everything from `TENANT_ONBOARDING_RUNBOOK.md` Step 6 ("Run Onboarding") onward is unchanged and remains the entry point once a prospect is activated.
- `TENANT_ONBOARDING_RUNBOOK.md` — the "Create Tenant" full-form path continues to exist unchanged for tenants that don't go through this prospect-invite flow (e.g. tenants onboarded outside the sales pipeline this covers).
- `PRODUCT_VISION.md` — most clients are delivered via a separately-deployed `agency-toolkit-template` clone, not admin-dashboard-rc's own `sites/[websiteId]` engine. This spec treats `tenants` as primarily a CRM/ops record (billing, ads integrations, plan, contact info) and makes the built-in website+domain provisioning opt-in rather than automatic.

## Context: what exists today

- `/api/billing/public/checkout/self-service` (`backend-rc/routes/billingPublic.js`) creates a Stripe subscription Checkout Session for a self-service signup (visitor-chosen plan, no tenant yet).
- `sendIntakeEmail` / `sendBillingInviteEmail` (`admin-dashboard-rc/src/lib/email.ts`) already exist as two separate, manually-triggered admin actions on the `Tenants` page — but both assume a tenant already exists, and there's no combined single action.
- `tenants.status` is currently `active | inactive | suspended` — no "not yet committed" state. Tenant creation today unconditionally provisions a live `{slug}.rctechbridge.com` website.

## Pipeline

```
Admin picks a prospect + plan_key, clicks "Invite Prospect"
        |
        v
POST /api/tenants/prospects (backend-rc)
   - creates tenant, status = 'prospect' (no website/domain provisioned)
   - creates Stripe Checkout Session (mode: subscription, metadata.tenant_id set)
   - generates intake token (existing createIntakeToken, unchanged)
   - sends ONE combined email: intake link + checkout link (no calendar link yet)
        |
        v
Prospect completes intake and/or pays, in either order
   - intake submit -> tenants.intake_completed_at set -> calendar link emailed
                       + shown immediately on the intake thank-you screen
   - Stripe checkout.session.completed -> webhook attaches subscription to
     tenant via metadata.tenant_id (new path, alongside existing self-service path)
        |
        v
Admin sees Intake: done/pending and Payment: done/pending badges on Tenants page
        |
        v
Admin runs "Activate Tenant" (status: prospect -> active)
   - optional checkbox: "Provision built-in website" (default OFF)
   - if OFF (majority case): tenant record only, site lives in a separately
     deployed agency-toolkit-template clone
   - if ON: existing website+domain auto-provisioning runs, same as today
        |
        v
TENANT_ONBOARDING_RUNBOOK.md Step 6 ("Run Onboarding") onward, unchanged
```

## Data model changes (`backend-rc`)

- Migration: extend `tenants.status` CHECK constraint to include `'prospect'`.
- Migration: add `tenants.intake_completed_at` (timestamptz, nullable).
- Migration: add `tenants.invited_by_admin_id` (integer, references the internal admin user, nullable).
- Existing website/domain auto-provisioning logic (wherever it runs today on tenant creation) gets a guard: skip while `status = 'prospect'`.

## New endpoint (`backend-rc`)

`POST /api/tenants/prospects` — admin-only, authenticated.

Request: `{ business_name, owner_name, owner_email, owner_phone?, business_type, plan_key }`

Steps, in order (so a failure never leaves a half-created prospect):

1. Validate `plan_key` exists, `is_active`, and has a `stripe_product_id` (reuse the lookup already in `billingPublic.js`).
2. Check for an existing `prospect`-status tenant with the same `owner_email`; if found, return `409` with that tenant's id (admin should resend, not duplicate).
3. Create the tenant row (`status = 'prospect'`, slug auto-generated from `business_name`, same slug logic as today's full Create Tenant path).
4. Create the Stripe Checkout Session (`mode: subscription`, reusing `resolveStripePriceId` + `stripeApiRequest`), with `subscription_data[metadata][tenant_id]` set to the new tenant's id. **If this step fails, delete the tenant row created in step 3** and return the error — nothing is emailed and no prospect is left orphaned.
5. Generate an intake token via the existing `createIntakeToken(tenantId, businessType, ...)`.
6. Send one new combined email (new template, matching the visual style of the existing intake/billing-invite templates) with two CTAs: "Complete your questionnaire" (intake link) and "Activate your plan" (checkout link).
7. Record the send in the existing owner-invite tracking columns (`invite_status`, attempt count) so it appears in the `Tenants` list like any other invite, and the existing "Resend Invite" action works unchanged.

Response: `{ tenant_id, invite_status }`.

### Admin UI (`admin-dashboard-rc`)

New "Invite Prospect" action on the `Tenants` page — a lighter form than full Create Tenant (just the 6 fields above; no timezone/currency/temp password/modules, which stay specific to the full-tenant path). The `Tenants` list gains two badges per row: `Intake: done/pending`, `Payment: done/pending`.

## Intake completion → calendar reveal

- `/api/intake/submit` (existing route) gains one addition: on successful save, if `intake_completed_at IS NULL`, set it to `now()` and send a follow-up email containing the calendar booking link (a single shared scheduler URL via `CALENDAR_BOOKING_URL` env var — Calendly or equivalent). The `IS NULL` guard makes this idempotent against resubmits.
- The intake success/thank-you screen also shows the "Book your kickoff call" CTA immediately in-browser, without waiting on the follow-up email.
- We cannot technically block access to an external scheduler URL — "gating" means the link is simply not sent/shown until intake is done, not that the URL itself enforces access control.

## Payment webhook change

- The existing subscription webhook (`backend-rc/routes/stripeSubscriptionWebhook.js`) gains a branch: if `checkout.session.completed` metadata includes `tenant_id`, attach the resulting subscription to that tenant directly. The existing self-service path (email/business_name only, no tenant yet) is unchanged.

## Error handling

- Stripe session creation fails → tenant row rolled back, admin sees the error, nothing emailed.
- Email send fails → existing `invite_status` states (`not_sent`/`sent`/`partial_failure`/`failed`) and existing "Resend Invite" action cover retry; no new UI needed.
- Duplicate invite for the same email → `409` before any tenant is created, pointing at the existing prospect.
- Duplicate intake submit → guarded by `intake_completed_at IS NULL` check, so the calendar email fires exactly once.

## Testing

- **Unit**: plan validation, slug generation for the lightweight tenant, the guard skipping website/domain provisioning for `status = 'prospect'`.
- **Integration**: happy path through `POST /api/tenants/prospects`; Stripe-failure rollback; duplicate-email `409`.
- **Manual**: confirm `/api/intake/submit` sets `intake_completed_at` and fires the calendar email exactly once; confirm the webhook attaches `checkout.session.completed` to the right prospect via `tenant_id` metadata; confirm the `Tenants` list shows the new prospect status and intake/payment badges; confirm "Activate Tenant" transitions status and only provisions a website when explicitly checked.

## Out of scope (this spec)

- Per-admin scheduling links (one shared `CALENDAR_BOOKING_URL` is sufficient for v1).
- The intake-answers → `site.config.ts` provisioning pipeline for new `agency-toolkit-template` clones — separate spec, depends on this one's finished intake data shape.
- Building an in-house scheduler to replace the third-party calendar link.
