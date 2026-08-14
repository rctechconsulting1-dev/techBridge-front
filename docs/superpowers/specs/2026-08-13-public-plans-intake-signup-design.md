# Public Plans Page — Intake-First Self-Serve Signup

Date: 2026-08-13
Status: Draft, pending implementation planning
Repos affected: `admin-dashboard-rc` (new public page, new public API route) and `backend-rc` (new public tenant-creation route, shared-logic extraction).

## Purpose

Today, a website visitor interested in a plan has no self-serve path to the intake questionnaire at all. The only self-service path that exists (`PricingSection.tsx`'s "Get Started" modal → `POST /billing/public/checkout/self-service`) goes straight to Stripe Checkout with no intake step, and its own webhook handler explicitly does not create a tenant — its code comment says "No tenant is created yet — that happens after the subscription webhook fires and an admin onboards them." The only way a prospect gets the intake questionnaire today is an admin manually creating their tenant first.

This design adds a dedicated public `/plans` page. A visitor picks a plan, submits name/email/business name, and immediately (no payment) gets a prospect tenant created and the intake questionnaire emailed to them. From there, the **existing** flow already takes over unchanged: they complete the questionnaire, get the calendar-ready email with the Google Calendar booking link, and book a kickoff call. Payment is deliberately deferred — after the call, an admin sends the real Stripe payment link using the **existing** `POST /api/billing/invite` capability already wired into the admin dashboard.

## Context: what exists today

- `src/components/landing/PricingSection.tsx` — the current homepage pricing cards. Shows exact `$X/mo` per plan. Its "Get Started" CTA opens a modal (name/email/business name) that POSTs directly to backend-rc's `POST /billing/public/checkout/self-service` and redirects to Stripe. This modal and its direct-to-Stripe behavior are being replaced by this design.
- `backend-rc/routes/billingPublic.js` (`POST /checkout/self-service`) — unauthenticated, creates a Stripe Checkout Session, records a `billing_events` row, returns `{ url }`. Left in place but unreferenced by the frontend after this change (not deleted this pass).
- `backend-rc/lib/billingEventProcessor.js:126-154` — on `customer.subscription.created` with `metadata.source === "self_service"`, only logs a `platform.self_service_signup.completed` billing_events row. No tenant provisioning. Unrelated to and unchanged by this design (the new flow never creates a Stripe subscription at signup time).
- `backend-rc/routes/tenantProspects.js` `POST /` (admin-only: `authMiddleware, requireAdminRole`) — the admin-initiated invite flow. In one request: validates `businessName`/`ownerName`/`ownerEmail`/`planKey`, checks for an existing prospect or user with that email (`409 PROSPECT_EMAIL_IN_USE` / `409 OWNER_EMAIL_IN_USE`), creates the tenant (`status = 'prospect'`) and owner user in a transaction (lines ~83-193), then **separately** creates a Stripe Checkout Session tied to the new tenant (lines ~195-254, with compensating rollback of the tenant if Stripe fails) and returns `checkoutUrl`. This design reuses only the tenant/owner-creation portion (through the transaction commit) — not the Stripe session portion, which the new public flow skips entirely.
- `backend-rc/lib/tenantHelpers.js` — `BUSINESS_TYPES` (`lead_gen_services`, `appointments`, `ecommerce`, `reservations`, `hybrid_local`), `normalizeEmail`, `slugify`, `ensureUniqueSlug`, `upsertInviteTracking`. The admin route falls back to `"lead_gen_services"` when `businessType` is missing/invalid — the new public route always uses this same default.
- `src/lib/email.ts` `createIntakeToken()` / `sendIntakeEmail()` — signs a 7-day intake token (email, tenantId, businessType, websiteId, tenantName, modules) and sends the questionnaire email via Resend. Already callable in-process from any Next.js API route in this repo (used today by `src/app/api/email/intake/route.ts`).
- `backend-rc/routes/billing.js` `POST /invite` (Step C3, ~line 696) — generates a Stripe Checkout URL for an **existing** tenant + `plan_key` without redirecting, meant to be emailed. Already wired into the admin dashboard's `tenants/page.tsx`. This is what an admin uses after the kickoff call — no changes needed here.
- Calendar-ready email and booking: `src/app/api/intake/submit/route.ts` (on `firstCompletion`, calls `sendCalendarReadyEmail`) and `sendCalendarReadyEmail()` in `src/lib/email.ts` (links to `process.env.GOOGLE_CALENDAR_BOOKING_URL`, Google's hosted Appointment Schedule page). Unchanged by this design.
- Nav today (`src/components/landing/Navbar.tsx`): `Home` (`/`), `Services` (`/#services`), `About` (`/#about`), `Contact` (`/#contact`) — all anchors on one homepage. No dedicated pricing/plans page or nav entry exists yet.

## New page: `/plans`

- New route `src/app/plans/page.tsx`. Public, unauthenticated, standalone page (not a homepage anchor section).
- New component `src/components/landing/PlansSection.tsx`, adapted from `PricingSection.tsx`'s card layout and copy (same 4 plans: Starter, Professional, Business, Enterprise). Each price is prefixed "Starting at" — e.g. "Starting at $149/mo" — Enterprise stays "Custom". Feature lists and plan metadata (setup fee, commitment, seats) carry over unchanged.
- Per-plan CTA opens a modal with three visible fields — name, email, business name — plus one hidden honeypot field (e.g. `website_url`, CSS-hidden, no `autocomplete`, not in tab order). No plan-price/payment content in the modal; copy instead sets expectations ("You'll get a short questionnaire by email, then we'll book a quick kickoff call").
- On submit, POSTs to the new `/api/public/signup` route (below). On success, the modal replaces itself with a confirmation state: "Check your email for your questionnaire" — no redirect anywhere. On a real validation error (400), shows the error inline in the modal, same pattern as the existing `PricingSection` modal's `formError` state.
- `Navbar.tsx`: add `{ label: "Plans", href: "/plans" }` to `NAV_LINKS`, alongside the existing four anchors.
- `PricingSection.tsx` (homepage): each plan card's CTA becomes a `<Link href="/plans">` instead of opening the self-service checkout modal. The modal JSX/state (`modalPlan`, `formEmail`, `formName`, `formBusiness`, `submitting`, `formError`, `handleSubmit`, the `API_BASE` self-service fetch) is deleted from this component — the cards remain, only their behavior changes to "go look at `/plans` and sign up there."

## New API route: `POST /api/public/signup`

New file `src/app/api/public/signup/route.ts` in admin-dashboard-rc. Unauthenticated. Request body: `{ plan_key: string, name: string, email: string, business_name: string, website_url?: string }` (`website_url` is the honeypot).

1. If `website_url` is non-empty, skip everything below and return the same generic success response as step 5 — never reveal that the submission was rejected.
2. Validate `email` (format) and `business_name`/`name` (non-empty). Real validation failures return `400` with a field-level error message for the modal to display.
3. Call the new backend route, `POST {API_BASE}/tenant-prospects/public`, with `{ businessName: business_name, ownerName: name, ownerEmail: email, planKey: plan_key }`. It returns `{ tenantId: number | null, websiteId, businessName, ownerEmail }` — `tenantId: null` means "an active non-prospect account already owns this email, do nothing further" (see backend route below); any other case (new tenant or existing prospect) returns a real `tenantId`.
   - If the backend returns a hard failure (bad `plan_key`, unexpected 5xx), log server-side and still return the generic success response to the visitor — matches the existing swallow-and-log pattern in `submit/route.ts` for calendar-email failures. Do not leak backend error details to an anonymous caller.
4. If `tenantId` is `null`, skip straight to the generic success response — no email sent. Otherwise call `sendIntakeEmail({ to: email, firstName: name, tenantName: business_name, tenantId, businessType: "lead_gen_services", websiteId })` directly (in-process — no HTTP hop). This is unconditional whenever `tenantId` is present — it's what makes the existing-prospect case a "resend" for free, with no further special-casing needed here.
   - If `sendIntakeEmail` throws, call a new internal backend-rc endpoint, `POST /tenant-prospects/:tenantId/signup-email-failed`, protected by the existing `requireInternalKey` middleware (same pattern `intake-complete` already uses, since admin-dashboard-rc has no direct DB pool — all persistence goes through backend-rc's API). That endpoint writes one `billing_events` row: `tenant_id: tenantId, event_type: 'platform.public_signup.intake_email_failed', status: 'error', payload: { email }`. If that call itself fails, log server-side only. Return generic success to the visitor either way.
5. Generic success response in all non-400 cases: `{ ok: true }`.

## New backend route: `POST /tenant-prospects/public`

New file `backend-rc/routes/tenantProspectsPublic.js`, mounted unauthenticated (same mounting pattern as `billingPublic.js`). Body: `{ businessName, ownerName, ownerEmail, planKey }`.

1. Validate `businessName`, `ownerName`, `ownerEmail` (format), `planKey` non-empty — `400` with a `code` on failure, same shape as the admin route's validation errors.
2. Look up `planKey` in `public.plans` (`WHERE plan_key = $1 AND is_active = true`) — `404 PLAN_NOT_FOUND` if missing. (No Stripe product/price resolution — this route never touches Stripe.)
3. Check for an existing prospect or user with `normalizeEmail(ownerEmail)`, same two queries the admin route already runs (existing prospect first, then any existing user).
   - **Existing prospect** (still mid-onboarding, same case the admin route's `PROSPECT_EMAIL_IN_USE` covers): skip creation and return `201 { tenantId, websiteId, businessName, ownerEmail }` for that **existing** tenant — identical shape to the fresh-creation case in step 5, so the caller always proceeds to (re)send the intake email. No `409` — this route never reveals whether an email was already known.
   - **Existing non-prospect user** (an active customer, staff, or any other real account — the admin route's broader `OWNER_EMAIL_IN_USE` case): do **not** create anything and do **not** return real tenant info — an already-active account should never get a fresh onboarding questionnaire. Return `201 { tenantId: null, websiteId: null, businessName, ownerEmail }`, identical HTTP status and shape to every other case, so this is indistinguishable from a real signup to anyone inspecting network traffic; the caller's `tenantId === null` check (above) is what actually suppresses the email.
   - **Not found**: continue to step 4.
4. Create the tenant (`status = 'prospect'`, `plan_key = planKey`, `business_type = 'lead_gen_services'`) and owner user, exactly as the admin route does today (slug generation, `user_tenant_roles` row, `upsertInviteTracking`), inside the same transaction shape. **No Stripe Checkout Session is created** — this route stops where the admin route's transaction commits, before its separate Stripe-session block begins.
5. Return `201 { tenantId, websiteId, businessName, ownerEmail }` — just enough for the admin-dashboard-rc caller to build the intake token. No `checkoutUrl` (there isn't one).

### Shared-logic extraction

The tenant/owner/`user_tenant_roles`/`upsertInviteTracking` creation logic in `tenantProspects.js`'s `POST /` handler (roughly lines 83-193, through the transaction commit) moves into a new shared helper — e.g. `lib/tenantHelpers.js: createProspectTenantAndOwner(client, { businessName, ownerName, ownerEmail, ownerPhone, businessType, planKey, invitedByAdminId })` — returning `{ tenant, ownerUser, duplicate: 'prospect' | 'user' | null }` instead of writing the HTTP response directly. Both `tenantProspects.js`'s admin route and the new `tenantProspectsPublic.js` route call this helper and then diverge: the admin route continues into its Stripe-session block and admin-style `409` responses; the public route skips Stripe and uses the duplicate-resend behavior above. This keeps the two entry points behaviorally identical for the part that matters (how a prospect tenant gets created) without duplicating the SQL.

## Abuse protection

Honeypot only for this pass (per explicit decision — "simple" protection, no CAPTCHA, no rate limiting). A bot that fills every field, including the hidden one, still gets silently absorbed with a fake-success response rather than an error that would tell it to adjust. Real per-IP/email rate limiting is an explicit non-goal here and can follow later if abuse is observed.

## Error handling summary

| Failure | Behavior |
|---|---|
| Honeypot filled | Silent generic success, nothing created |
| Invalid email / missing business name | `400`, shown inline in the modal |
| Duplicate email — existing prospect | Backend returns that tenant's real info in the same response shape as a fresh signup; the intake email send in step 4 is unconditional whenever `tenantId` is present, so this becomes a resend automatically |
| Duplicate email — existing non-prospect (active customer, staff) | Backend returns `tenantId: null`; frontend skips the email send entirely; generic success either way |
| Unknown/inactive `plan_key` | `404` from backend, surfaced as generic success to the visitor (logged server-side) — a bad `plan_key` here means a frontend bug (stale plan list), not a visitor-fixable input error |
| `sendIntakeEmail` throws | `billing_events` row logged via internal backend endpoint; generic success still returned to the visitor |
| Backend unreachable / 5xx | Logged server-side; generic success still returned |

## Out of scope

- Calendar booking, `intake-complete`, `sendCalendarReadyEmail` — unchanged.
- `POST /api/billing/invite` and its admin UI — unchanged; this is the post-call payment step.
- Deleting `POST /billing/public/checkout/self-service` or its webhook handling — left in place, just unreferenced.
- Website provisioning behavior — inherits whatever `createProspectTenantAndOwner` does today (via the shared helper); not being changed, just reused.
- Business-type selection on the public form — always defaults to `lead_gen_services`; correctable later by an admin before the post-call Stripe invite is sent.
- Per-IP/email rate limiting — explicit non-goal, honeypot only.

## Testing approach

No test runner in either repo. Verification is `tsc --noEmit` (admin-dashboard-rc) + manual curl/browser: submit `/plans` with a fresh email and confirm a `prospect` tenant + intake email appear; resubmit the same email and confirm it resends rather than duplicating; submit with the honeypot field filled and confirm nothing is created; confirm the homepage pricing cards link to `/plans`; confirm `/plans` appears in the navbar.
