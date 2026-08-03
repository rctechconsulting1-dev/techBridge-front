# Client Onboarding Call Script

Audience: internal admin employees
Status: Active
Prerequisite: kickoff call booked via the existing prospect-invite → intake
→ payment → booking pipeline (see
`docs/superpowers/specs/2026-07-28-admin-initiated-prospect-invite-design.md`
and `2026-07-31-google-calendar-kickoff-booking-design.md`). Run this
script live on the call, then proceed to `TENANT_ONBOARDING_RUNBOOK.md`
Step 6.

## Before the call

1. Review the client's submitted `/intake` answers and enabled modules.
2. If the Google Ads Optimization module was sold: send an MCC (manager
   account) link request from RD Tech Bridge's own Google Ads manager
   account to the client's Google Ads account ID (from intake). The client
   can accept it any time before or during the call. See
   `AGENCY_AD_PLATFORM_SETUP_CHECKLIST.md` if RD Tech Bridge's own MCC
   account doesn't exist yet.
3. If Meta Ads was sold: send a Meta Business Manager partner request to
   the client's ad account. Same prerequisite checklist applies.
4. Create the client's Google Drive asset folder (subfoldered: logo,
   photos, brand docs, testimonials) — link is already included in
   `/intake`.
5. If no logo was provided in intake: generate 2-3 AI logo options ahead
   of time.

## Call sequence

Run this on Zoom, client sharing their own screen and driving their own
browser throughout. Admin never types into or stores a password for any
client-owned account. Client only grants Zoom remote control briefly, and
only if requested in the DNS step below.

### 1. Gmail (only if the client doesn't already have one)

Client creates a new Gmail account live and sets their own password.
Admin does not see or store it. This account becomes the identity used
for every Google service below (and later, GA4/Search Console after
launch).

### 2. Google Drive asset folder

Confirm the client has what they need to drop into the folder shared via
`/intake` (logo, photos, brand assets). Not a live step if intake shows
it's already been used.

### 3. Domain / DNS — only if the client has or is buying a custom domain

Client adds the DNS records shown in the admin dashboard's
`Global Site Settings` → Domains section themselves. If they get stuck,
they briefly grant Zoom remote control for this step only, then take it
back. Skip entirely if launching on the free
`{slug}.rctechbridge.com` preview URL for now.

### 4. Google Business Profile — confirm only

Already handled asynchronously before the call via `/intake`'s existing
instructional text (client adds `rctechsolutions1@gmail.com` as Manager).
Just confirm it's done; if not, walk the client through it now using the
same instructions from intake.

### 5. Stripe — only if the Checkout / Ecommerce module was sold

This is the client's own Stripe account for their own deposits/checkout —
separate from RD Tech Bridge's own subscription-billing Stripe account,
which the client never touches.

1. Client goes to Stripe Dashboard → Developers → API keys → Create
   restricted key.
2. Scope it to `Checkout Sessions: Write` and `Webhook Endpoints: Write`
   only.
3. Client reads the key aloud; admin pastes it into the client's
   `agency-toolkit-template` `.env.local` as `STRIPE_SECRET_KEY`.
4. Client goes to Settings → Team → Invite, adds
   `rctechsolutions1@gmail.com` as a **Support Specialist**, for
   read-only visibility into payments/logs during future debugging.

### 6. Google Ads / Meta Ads — confirm only, if either module was sold

Confirm the client accepted the MCC link request / Meta partner request
sent before the call. If not yet accepted, walk them through accepting it
now (Google Ads: notification bell or Account Access Manager; Meta:
Business Settings → Partners). No password or login involved either way.

### 7. Automation & Workflows discovery follow-up

Live conversation, not an account setup step: clarify and expand on the
client's `/intake` answers to the Automation & Workflows section (what's
manual/repetitive today, current tools, interest in automation add-ons).

### 8. Logo

If a logo was already provided in intake, confirm it. If not, show the
AI-generated options prepared before the call and get a pick or direction
for revisions.

## Not on this call

- **Google Analytics and Search Console** — deferred to a post-launch step
  once the domain is verified `active`, per `TENANT_ONBOARDING_RUNBOOK.md`
  Step 11 and `POST_LAUNCH_GA_GSC_EMAIL_TEMPLATE.md`. Doing this on the
  call would mean re-verifying later against the final domain.
- **SMS (Twilio)** — no client action; RD Tech Bridge provisions an
  agency-owned subaccount after the call.
- **Custom AI Agent** — no client-facing account; runs on agency-owned
  infra.
- **GitHub, Vercel, Sanity** — agency-owned infrastructure; the client
  never signs up for any of these.

## After the call

1. Confirm every checklist item above shows "connected" in its respective
   platform.
2. Chase any unfinished item asynchronously (e.g. DNS propagation,
   pending Stripe key).
3. Proceed to `TENANT_ONBOARDING_RUNBOOK.md` Step 6 ("Run Onboarding").
4. Once the domain later verifies `active`, trigger the post-launch
   GA4/Search Console step (`TENANT_ONBOARDING_RUNBOOK.md` Step 11.4).

---

Full design rationale and per-service ownership table:
`docs/superpowers/specs/2026-08-03-onboarding-call-access-checklist-design.md`.
