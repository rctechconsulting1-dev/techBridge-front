# Onboarding Call & Access Checklist Design

Date: 2026-08-03
Status: Draft, pending implementation planning
Repos affected: none (ops/process only, no code changes)

## Purpose

Fill the gap explicitly left open by `2026-07-22-client-onboarding-process-design.md`:
an "adaptive access-checklist template, keyed by module" for the live onboarding
call. That spec designed the call's *shape* (Zoom remote control, client types
own passwords, no plaintext credential custody) but not the concrete per-service
checklist. This spec is that checklist: which accounts exist, who owns each one,
exactly how RD Tech Bridge gets admin/manager access to each, and in what order
they get handled relative to the call.

## Relationship to existing docs

- `2026-07-22-client-onboarding-process-design.md` — this spec is the detail
  behind that spec's Stage 3 ("The onboarding call"). The call's mechanics
  (Zoom, client-driven, no credential custody) are unchanged; this spec adds
  the actual checklist content that was deferred there.
- `2026-07-28-admin-initiated-prospect-invite-design.md` / structured intake /
  Google Calendar kickoff-booking specs — the prospect → intake → payment →
  booking pipeline these describe is unchanged and already implemented. This
  spec picks up immediately after a kickoff call is booked.
- `TENANT_ONBOARDING_RUNBOOK.md` — Step 11 ("Configure Domain, Email, And
  Payments") is where the new async post-launch step (below) attaches.
- `backend-rc/README.md` "Onboarding New Tenants" section — the manual
  `ads-mcp` config + `marketing_connection` steps described there are the
  destination for the Google Ads / Meta Ads access this spec sets up.
- `agency-toolkit-template/docs/onboarding.md` — the developer-facing
  repo/env-var setup checklist. This spec's Stripe/GA env vars feed into that
  same file; this spec doesn't change it.

## Ownership model

Decided during design: RD Tech Bridge owns delivery infrastructure so the
client never has to sign up for anything to receive their site. The client
only owns accounts tied to their own business identity or their own money.

| Owned by RD Tech Bridge (client never signs up) | Owned by the client (RD Tech Bridge gets admin/limited access) |
|---|---|
| GitHub repo (from `agency-toolkit-template`) | Gmail (created live if missing, client keeps it) |
| Vercel projects (web + studio) | Google Business Profile |
| Sanity project | Google Analytics (GA4) property |
| Twilio (agency account, per-client subaccount) — SMS module only | Google Search Console property |
| OpenAI/agent infra — AI module only | Domain registrar |
| | Stripe (client's own, for their deposits/checkout) — Checkout/Ecommerce module only |
| | Google Ads account — Ads module only |
| | Meta Business Manager — Ads module only, if Meta is sold |

Because RD Tech Bridge owns the GitHub repo and Vercel projects, the client's
site can go live immediately: deploying the `agency-toolkit-template` repo
to its own (separate, per-client) Vercel project gets a default
`*.vercel.app` URL from Vercel with zero extra configuration, independent of
whether the client has purchased a custom domain. Per
`TENANT_ONBOARDING_RUNBOOK.md`'s "Common Mistakes to Avoid" (using a
one-off `vercel.app` preview URL as a tenant's durable public hostname is
called out there as a mistake to avoid), this `.vercel.app` URL should be
treated the same way here — a temporary launch artifact, not a durable
public hostname. The client should move off it onto a custom domain (or an
agency-branded subdomain, if one exists for this delivery path) as soon as
practical. This is what unblocks GA4 (which needs no live site at all to
create a property) but does **not** fully unblock Search Console's
domain-verified flow, which needs either DNS ownership or waiting for the
final URL — see "Post-launch checklist" below for how this is resolved.

## Pipeline

```
Intake + payment + booking complete (existing, unchanged)
        |
        v
Admin reviews intake; sends Google Ads MCC link request / Meta partner
request ahead of time if the Ads module was sold (client can accept any
time before or during the call, doesn't consume call time either way)
        |
        v
Onboarding call (Zoom, client shares screen) — call-day checklist only
   - client drives their own browser throughout
   - client briefly grants Zoom remote control ONLY for DNS record entry,
     if they get stuck
   - admin never types into or stores a password for any client-owned account
        |
        v
Admin confirms every call-day checklist item shows "connected"
        |
        v
TENANT_ONBOARDING_RUNBOOK.md proceeds; Step 11 domain verification happens
whenever the client's custom domain is ready (may be same day or weeks later)
        |
        v
Post-launch step: once domain shows `active`, admin sends the GA4 + Search
Console instructions (async, not live) against the final domain
        |
        v
Onboarding complete; hand off to TENANT_ONBOARDING_RUNBOOK.md Step 12 onward
```

## Call-day checklist

**Always required** (every client):

| Service | Owner | Mechanism (client action) | What admin captures afterward |
|---|---|---|---|
| Gmail | Client | Created live if missing, client keeps the password | The email address, into the tenant record |
| Google Drive asset folder | Admin creates, client uploads | Admin creates the per-client folder (logo/photos/brand docs/testimonials subfolders) *before* the call per the existing July 22 spec; call only confirms the client has what they need | Folder link already woven into `/intake`, unchanged |

**Conditional on the client having or buying a custom domain** (skipped
entirely if they're launching on the default, temporary `*.vercel.app` URL
for now — see "Ownership model" above on why that URL isn't durable):

| Service | Owner | Mechanism (client action) | What admin captures afterward |
|---|---|---|---|
| Domain registrar / DNS | Client | Client adds DNS records themselves per the runbook's existing DNS-records screen; briefly hands Zoom remote control to admin only if stuck | Domain status tracked in Global Site Settings, verified `active` later per `TENANT_ONBOARDING_RUNBOOK.md` Step 11 |

**Google Business module:**

| Service | Owner | Mechanism | Notes |
|---|---|---|---|
| Google Business Profile | Client | Already async, pre-call, unchanged — client adds `rctechsolutions1@gmail.com` as **Manager** directly from the existing `/intake` instructional text | Call only confirms it's done if intake shows it's still pending |

**Checkout / Ecommerce module:**

| Service | Owner | Mechanism | Notes |
|---|---|---|---|
| Stripe (client's own, for their deposits/checkout — separate from RD Tech Bridge's own subscription-billing Stripe account, which the client never touches) | Client | Client generates a **restricted API key** (Developers → API keys → Create restricted key) scoped to `Checkout Sessions: Write` + `Webhook Endpoints: Write`, reads it aloud; admin pastes into the client's `.env.local` per `agency-toolkit-template/docs/onboarding.md`. Client also invites `rctechsolutions1@gmail.com` as a **Support Specialist** team member (Settings → Team → Invite) for read-only visibility into payments/logs during future debugging | A restricted key is sufficient for building the integration because the Checkout/webhook code is generic and templated — admin never needs the client's Stripe dashboard to build it, only to debug it later, which the Support Specialist role covers |

**Google Ads Optimization module:**

| Service | Owner | Mechanism | Notes |
|---|---|---|---|
| Google Ads account | Client | Admin sends an MCC (manager account) link request from RD Tech Bridge's own Google Ads manager account *before* the call, using the account ID from intake; client clicks **Accept** in their own account — no login, no password | Once linked, `business_key` + account ID added to `ads-mcp`'s `local-dev-config.json` and a `marketing_connection` row inserted, per the existing manual process in `backend-rc/README.md` |
| Meta Ads account (if sold) | Client | Client adds RD Tech Bridge's Meta Business Manager ID as a **partner** (Business Settings → Partners → Add) and approves the ad-account-access request | Same `marketing_connection` insert pattern, platform `meta-ads` |

**SMS Leads and Comms module:** no client action — admin provisions a Twilio
subaccount under the agency's parent account after the call. Matches the
agency-owned-infra decision above; avoids per-client A2P 10DLC registration
complexity landing on the client.

**Custom AI Agent module:** no client-facing account — agency-owned infra,
nothing for the call.

**Call sequence:** Gmail first (everything else may need a Google identity),
then domain/DNS, then Stripe (if applicable), then a discovery follow-up on
the intake's Automation & Workflows answers, then logo review. Google
Business Profile and Google Ads/Meta are confirmed rather than walked
through live, since both are handled asynchronously before or alongside the
call.

## Post-launch checklist (not on the call)

Google Analytics and Search Console are deliberately **not** part of the
live call. GA4 needs no live site to create a property, but verifying it
against a URL that's about to be replaced by the real domain creates
rework, and Search Console's cleanest verification path needs a live,
permanent URL. Both are deferred to an async step triggered once
`TENANT_ONBOARDING_RUNBOOK.md` Step 11 shows the domain as `active`:

| Service | Owner | Mechanism | What admin captures afterward |
|---|---|---|---|
| Google Analytics (GA4) | Client | Admin emails instructions once the domain is live: client creates a GA4 property for their now-live domain, adds `rctechsolutions1@gmail.com` as **Editor** under Admin → Property Access Management | `NEXT_PUBLIC_GA_MEASUREMENT_ID` into the client's `agency-toolkit-template` `.env.local` |
| Google Search Console | Client | Same email: client adds a Search Console property (URL-prefix or Domain, whichever fits) for the live domain, adds `rctechsolutions1@gmail.com` as a **full user** | Feeds `search-console-mcp` — property URL recorded in the same `ads-mcp` config update as the Ads module, if both apply |

This becomes a new checklist item in `TENANT_ONBOARDING_RUNBOOK.md` Step 11,
tracked the same way domain/email/payment setup already is — no new UI,
just a documented follow-up email sent once domain verification succeeds.

## Canonical email

Every "add this as admin/editor/manager" instruction in this checklist uses
`rctechsolutions1@gmail.com` — already the one live in production, hardcoded
into `intake-questions.ts` and `email-templates.ts` for Google Business
Profile access today. `rctechconsulting1@gmail.com` (legal/contact pages)
and `info@rctechbridge.com` (marketing site) are unrelated, existing uses
and are out of scope to change here.

## Follow-through

Same as `2026-07-22-client-onboarding-process-design.md` Stage 4 — if a
call-day checklist item isn't finished during the call (e.g. DNS still
propagating), admin chases it asynchronously afterward. Onboarding is
complete when every call-day item is confirmed, the domain eventually
verifies, and the post-launch GA4/Search Console email has been sent and
completed.

## Decisions and rationale

| Decision | Choice | Why |
|---|---|---|
| Remote access during the call | Zoom's built-in remote control, client drives | Matches the existing spec; nearly every service on this checklist has an invite/consent mechanism that needs no password sharing at all, so full third-party remote-desktop software was never actually necessary |
| Delivery infra ownership | RD Tech Bridge owns GitHub/Vercel/Sanity | Client is paying for a managed subscription, not infrastructure; removes 3 accounts from the client's plate entirely and unlocks an immediate (but temporary, non-durable) `*.vercel.app` URL at deploy time |
| Gmail creation | Client creates it, client keeps it | Consistent with never holding a client's plaintext password; RD Tech Bridge only ever needs role-based access to specific Google services built on top of it, never the mailbox itself |
| Stripe (client's own) | Restricted API key, not a dashboard invite | The integration code is generic/templated, so building it never required dashboard access; a scoped key is narrower than a team invite and keeps payout/bank details untouched |
| Google Ads / Meta Ads | MCC link request / Business Manager partner request, sent ahead of the call | Native to those platforms, needs zero password or login, and doesn't consume live call time since it's a one-click accept whenever the client gets to it |
| SMS (Twilio) | Agency-owned subaccount, no client account | Consistent with the infra-ownership decision; avoids per-client A2P 10DLC registration falling on the client |
| GA4 / Search Console timing | Deferred to a post-launch async step, not on the call | Verifying against a throwaway preview URL creates rework once the real domain goes live; these tools measure a permanent site, so they're sequenced to match |
| Canonical agency email | `rctechsolutions1@gmail.com` | Already live in production for the one access-grant instruction that exists today (GBP); zero migration cost |

## Out of scope

- Any code changes — this is an ops/process checklist only. No new
  admin-dashboard-rc UI, no backend-rc schema, no tenant-level checklist
  tracking.
- Cleaning up the three different agency-facing email addresses beyond
  standardizing what this checklist instructs clients to use.
- Automated intake-completion reminders (already out of scope in the July
  22 spec).
- Any change to the existing async Google Business Profile access pattern.
- Any change to the already-implemented prospect invite / intake /
  payment / booking pipeline.

## Implementation scope for the next phase

Process/ops setup only, no code:

1. Update the internal onboarding call script/agenda to the call-day
   checklist and sequence above.
2. Add a Step 11 follow-up item to `TENANT_ONBOARDING_RUNBOOK.md` for the
   post-launch GA4/Search Console email, once domain verification succeeds.
3. Draft the post-launch GA4/Search Console instructional email template.
4. Set up RD Tech Bridge's own Google Ads MCC account and Meta Business
   Manager (if not already in place) as the sender of the pre-call
   link/partner requests.
