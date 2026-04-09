# First Client Launch Readiness

Last updated: April 8, 2026

This guide is the operational audit for launching client one without relying on clicking through the frontend.

It answers three questions:

1. What can the platform do today?
2. What backend and integration dependencies must be healthy?
3. What is the shortest viable workflow to launch the first client?

## Launch Standard

Client one is considered launchable when the platform can do all of the following:

1. Provision a tenant, owner, website, and core page structure.
2. Capture intake and uploaded assets.
3. Save enough site settings to support a real lead path.
4. Persist reviewed core pages instead of serving fallback content.
5. Publish on a stable temporary RC-controlled domain.
6. Accept subscription billing for the tenant.

Everything else is conditional for client one.

Conditional items:

1. Final branded domain.
2. Tenant-branded email sender.
3. Stripe Connect onboarding.
4. Deposits, reservations, ecommerce checkout, invoices.
5. Additional SEO/support parent pages like Blog, FAQ, Reviews, Locations.

## Capability Audit

### 1. Tenant Provisioning

Status: implemented

Evidence:

1. [src/app/(admin)/(others-pages)/tenants/page.tsx](src/app/(admin)/(others-pages)/tenants/page.tsx) provisions a tenant through `POST /tenants`.
2. The provisioning flow sets tenant context, owner user, website, optional extra pages, feature toggles, and invite emails.
3. The create-tenant screen explicitly describes provisioning a tenant, owner account, website, default site structure, and initial entitlements.

Pass criteria:

1. `POST /api/tenants` succeeds.
2. Response includes tenant, owner user, website, and domain.
3. A temporary RC-controlled hostname is assigned when no final domain is provided.
4. Welcome, reset-password, and intake emails can be queued or at least attempted.

Launch-one verdict: pass

### 2. Intake Capture

Status: implemented

Evidence:

1. [src/app/intake/page.tsx](src/app/intake/page.tsx) handles questionnaire submission and uploads.
2. [src/app/api/intake/submit/route.ts](src/app/api/intake/submit/route.ts) verifies token, stores submission, indexes assets, and notifies admin.

Pass criteria:

1. Intake token verifies.
2. Submission stores answers and uploaded files.
3. Admin can fetch latest intake for a tenant/website.

Launch-one verdict: pass

### 3. Website Generation From Intake

Status: partial

Evidence:

1. [src/app/(admin)/(others-pages)/site-settings/page.tsx](src/app/(admin)/(others-pages)/site-settings/page.tsx) has `prefillFromLatestIntake` and `applyIntakeToSiteSettings`.
2. Intake data is staged into the form, not automatically persisted.
3. [src/app/(admin)/(others-pages)/built-in-pages/[pageKey]/page.tsx](src/app/(admin)/(others-pages)/built-in-pages/[pageKey]/page.tsx) requires actual editor persistence for Home, Services, About, and Shop.

What is missing:

1. Intake does not auto-create finished page copy.
2. Intake does not auto-persist site settings.
3. Built-in pages can remain fallback content until an operator saves them.

Pass criteria for launch one:

1. Intake data can be applied to site settings.
2. Core page content can be persisted after review.
3. Public site renders saved, tenant-specific content rather than fallback placeholders.

Launch-one verdict: partial but acceptable if operator review is part of the process

### 4. Lead / Conversion Website Foundation

Status: partial but viable

Evidence:

1. [src/app/(admin)/(others-pages)/tenants/page.tsx](src/app/(admin)/(others-pages)/tenants/page.tsx) seeds core pages and optional parent pages.
2. [src/app/(admin)/(others-pages)/built-in-pages/[pageKey]/page.tsx](src/app/(admin)/(others-pages)/built-in-pages/[pageKey]/page.tsx) supports structured page editing, SEO fields, workflow state, and publishing.
3. [src/app/(admin)/(others-pages)/site-settings/page.tsx](src/app/(admin)/(others-pages)/site-settings/page.tsx) manages shared contact info, nav, branding, and CTA-level settings.

What is true today:

1. The platform can support a lead-gen website.
2. The platform cannot guarantee local outranking.
3. The platform still needs operator review to avoid fallback content and generic messaging.

Pass criteria:

1. Home, Services, About, and Contact routes exist.
2. Contact path is usable.
3. Site settings contain real contact info and service area.
4. Core page content is tenant-specific and persisted.

Launch-one verdict: viable with operator review

### 5. Domain Management

Status: partial

Evidence:

1. [src/app/api/domains/status/route.ts](src/app/api/domains/status/route.ts) proxies backend domain status.
2. [src/app/(admin)/(others-pages)/site-settings/page.tsx](src/app/(admin)/(others-pages)/site-settings/page.tsx) supports launch mode, domain onboarding, DNS display, and verification actions.

What is true today:

1. Temporary RC-controlled domains are part of the real workflow.
2. Final-domain launch depends on backend and external provider behavior.
3. This repo does not prove the entire Vercel provisioning path by itself.

Pass criteria for launch one:

1. Temporary hostname exists and resolves.
2. Public site routes return 200 on the temporary hostname.

Pass criteria for final-domain launch:

1. Final custom domain exists.
2. Domain status is active.
3. The final domain is primary.

Launch-one verdict: temporary launch passes, final-domain launch requires extra verification

### 6. Email Delivery

Status: partial

Evidence:

1. [src/app/(admin)/(others-pages)/site-settings/page.tsx](src/app/(admin)/(others-pages)/site-settings/page.tsx) supports `platform_sender` and `tenant_branded` email modes.
2. [src/lib/resend-domains.ts](src/lib/resend-domains.ts) and the `/api/resend-domains/*` routes support sending-domain creation and verification with Resend.
3. [src/lib/intake-questions.ts](src/lib/intake-questions.ts) captures whether the tenant wants company email or bring-own email.

What is missing:

1. No proven mailbox provisioning flow for Google Workspace or equivalent exists in this repo.
2. Bring-your-own email is a workflow preference, not automated mailbox onboarding.

Pass criteria for launch one:

1. Platform sender works for notifications and temporary launch.
2. Lead notification recipients can be configured.

Pass criteria for final-domain launch:

1. Sending domain exists.
2. SPF and DKIM verify.
3. Live outbound test passes.

Launch-one verdict: acceptable with platform sender only

### 7. Tenant Subscription Billing

Status: implemented

Evidence:

1. [src/app/(admin)/(others-pages)/billing/page.tsx](src/app/(admin)/(others-pages)/billing/page.tsx) loads plans, entitlement snapshot, checkout, and portal flows.
2. [src/app/(admin)/(others-pages)/tenants/page.tsx](src/app/(admin)/(others-pages)/tenants/page.tsx) can send billing invites.
3. [src/app/api/email/billing-invite/route.ts](src/app/api/email/billing-invite/route.ts) sends billing invite email.

Pass criteria:

1. Plans load.
2. Checkout session can be created.
3. Billing portal session can be created.
4. Tenant entitlement snapshot loads.

Launch-one verdict: pass if backend billing routes are healthy

### 8. Stripe Connect And Payment Features

Status: partial

Evidence:

1. [src/app/api/stripe/connect/onboard/route.ts](src/app/api/stripe/connect/onboard/route.ts) proxies Stripe Connect onboarding.
2. [src/app/api/stripe/connect/status/route.ts](src/app/api/stripe/connect/status/route.ts) proxies Connect status.
3. [src/app/(admin)/(others-pages)/payment-config/page.tsx](src/app/(admin)/(others-pages)/payment-config/page.tsx) supports deposits, reservations, and ecommerce checkout toggles.
4. [src/app/api/stripe/checkout/route.ts](src/app/api/stripe/checkout/route.ts) proxies product checkout sessions.

What is missing or unproven:

1. Complete invoices workflow is not proven here.
2. Not every future money flow is demonstrably wired.
3. Frontend proxies are resilient to missing backend endpoints, which is useful, but also means some capability may still be absent server-side.

Pass criteria for a payments-enabled tenant:

1. Connect onboarding URL can be created.
2. Connect status returns account, charges, and payouts state.
3. Payment config saves.
4. Checkout session can be created when commerce is enabled.

Launch-one verdict: optional for client one unless payments are part of the actual offer

### 9. AI-Assisted Copy

Status: partial but useful

Evidence:

1. [src/hooks/useContentAgent.ts](src/hooks/useContentAgent.ts) calls `/api/content-agent` with industry, city, keyword, audience, CTA, and page-goal inputs.
2. [src/app/api/content-agent/route.ts](src/app/api/content-agent/route.ts) supports orchestrated draft generation and metadata generation.
3. [src/components/page-manager/PageCreationWizardEnhanced.tsx](src/components/page-manager/PageCreationWizardEnhanced.tsx) supports AI-assisted page creation.
4. [src/app/(admin)/(others-pages)/site-settings/page.tsx](src/app/(admin)/(others-pages)/site-settings/page.tsx) supports site-settings orchestration and template drafting.

What is missing:

1. No proven learning loop from manual edits back into future drafts.
2. No proof that AI alone can produce launch-ready local SEO copy without operator review.
3. AI helps drafting, but page persistence and publishing still remain separate steps.

Pass criteria:

1. AI can generate a structured draft and metadata for a tenant context.
2. Operator can review, edit, and persist the result.

Launch-one verdict: useful accelerator, not autonomous website generation

## Backend Dependencies To Verify Before Client One

These are the routes the frontend depends on for the first-client workflow.

### Critical

1. `POST /api/tenants`
2. `GET /api/tenants`
3. `GET /api/site-settings/:websiteId`
4. `PUT /api/site-settings/:websiteId`
5. `GET /api/built-in-page-content/editor/:pageKey?website_id=:id`
6. Draft / submit / review built-in page workflow endpoints
7. `POST /api/intake-assets/index`
8. `GET /api/domains/status?website_id=:id`
9. `GET /api/payment-config`
10. `PUT /api/payment-config`
11. `GET /api/billing/entitlements/:tenantId`
12. `POST /api/billing/checkout/session`
13. `POST /api/billing/portal/session`

### Conditional

1. `POST /api/stripe/connect/onboard`
2. `GET /api/stripe/connect/status?website_id=:id`
3. `POST /api/stripe/connect/checkout/session`
4. Email profile endpoints behind `/api/email/profile...`
5. Domain verification and external-provider hooks

## API-First Verification Sequence

Run these before trusting the frontend.

### A. Tenant Provisioning

Pass if:

1. backend health is 200
2. auth sign-in succeeds
3. create-tenant returns tenant, owner, website, and domain

Recommended checks:

```bash
curl http://localhost:5000/api/health

curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"cesar.rios@nakinc.org","password":"YOUR_PASSWORD"}'
```

### B. Intake Storage

Pass if:

1. intake submit returns success
2. latest intake admin route returns stored data

Relevant frontend routes:

1. `/api/intake/submit`
2. `/api/intake/admin/latest?websiteId=:id&tenantId=:id`

### C. Site Settings Persistence

Pass if:

1. site settings GET returns row
2. site settings PUT updates contact info, logo, nav, and launch mode
3. subsequent GET reflects saved values

### D. Core Page Persistence

Pass if:

1. editor GET for Home, Services, and About returns `source: persisted`
2. workflow and published content reflect real tenant content
3. public routes return 200

### E. Billing

Pass if:

1. plans load
2. entitlements load
3. checkout session returns redirect URL
4. portal session returns redirect URL

### F. Temporary Launch

Pass if:

1. temporary domain is active
2. `/`, `/services`, `/about`, `/contact` all return 200
3. contact/lead path works

### G. Final-Domain Launch

Pass only if:

1. final domain active
2. sending domain configured
3. SPF and DKIM verified
4. outbound test succeeded using branded sender

## Shortest Viable First-Client Workflow

This is the recommended workflow based on what the app actually supports today.

### Phase 1: Provision

1. Create tenant.
2. Accept temporary RC-controlled hostname by default.
3. Send owner welcome, reset, and intake emails.

### Phase 2: Intake

1. Tenant submits questionnaire.
2. Admin confirms latest intake exists.
3. Admin confirms uploaded assets are available.

### Phase 3: Foundation

1. Apply intake into site settings.
2. Save logo or temporary fallback.
3. Save phone, location/service area, and core navigation.
4. Keep launch mode as temporary launch unless final domain is already ready.

### Phase 4: Core Pages

1. Review Home.
2. Review Services.
3. Review About.
4. Verify Contact route and lead path.
5. Persist content so built-in pages stop returning fallback source.

### Phase 5: Billing

1. Confirm the subscription plan and billing invite path work.
2. Do not block launch on Stripe Connect unless payments are part of the actual initial offer.

### Phase 6: Go Live

1. Launch on temporary RC domain.
2. Verify public routes.
3. Verify lead conversion path.

### Phase 7: Later

1. Add final client domain.
2. Configure tenant-branded sender.
3. Complete Stripe Connect if needed.
4. Expand additional pages and advanced SEO assets.

## Current Recommendation

Do not position the current app as:

1. fully automatic website generation from intake
2. guaranteed local outranking
3. automatic Google mailbox provisioning
4. complete end-to-end financial operations for every payment case
5. autonomous AI publishing

Do position the current app as:

1. tenant provisioning platform
2. intake-driven website setup workflow
3. operator-assisted local lead-gen site builder
4. temporary-launch-first deployment model
5. subscription-managed tenant platform with optional Stripe Connect expansion

## Client-One Go / No-Go Rule

Go if all are true:

1. tenant creation works
2. intake capture works
3. site settings persist real contact and nav data
4. core built-in pages are persisted, not fallback
5. public temporary domain routes work
6. lead path is tested
7. billing is functional

No-go if any are false.