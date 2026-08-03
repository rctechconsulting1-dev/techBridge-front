# Onboarding Call Access Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Operationalize `docs/superpowers/specs/2026-08-03-onboarding-call-access-checklist-design.md` into the actual docs an admin uses: an updated `TENANT_ONBOARDING_RUNBOOK.md`, a standalone call script, a post-launch GA4/Search Console email template, and a one-time manual setup checklist for the agency's own ad-platform accounts.

**Architecture:** This is a documentation-only change set inside `admin-dashboard-rc`. No application code, schema, or UI changes — the spec explicitly scopes this to ops/process. Three new files under `docs/guides/`, plus targeted edits to the existing `TENANT_ONBOARDING_RUNBOOK.md` that link them in at the right points (before Step 6, and inside Step 11).

**Tech Stack:** Markdown only.

## Global Constraints

- Canonical agency email for every access-grant instruction: `rctechsolutions1@gmail.com` (per spec).
- No application code, backend-rc, agency-toolkit-template, or ads-mcp changes — docs only, all in `admin-dashboard-rc`.
- Do not touch the existing async Google Business Profile pattern (`rctechsolutions1@gmail.com` as Manager, triggered from `/intake`) — reference it, don't change it.
- Do not add GA4/Search Console setup to the live call — they are a post-launch, domain-gated step per the spec.
- Follow this repo's git conventions: work from a `docs/` branch (not directly on `main`, per `CLAUDE.md`/existing spec conventions), Conventional Commits (`docs:`), no `Co-Authored-By` lines, no em dashes.

---

### Task 1: Link the call script and post-launch step into `TENANT_ONBOARDING_RUNBOOK.md`

**Files:**
- Modify: `admin-dashboard-rc/docs/guides/TENANT_ONBOARDING_RUNBOOK.md`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: two file references (`ONBOARDING_CALL_SCRIPT.md`, `POST_LAUNCH_GA_GSC_EMAIL_TEMPLATE.md`) that Tasks 2 and 3 must create with those exact filenames in `admin-dashboard-rc/docs/guides/`.

- [ ] **Step 1: Add the call script to the Companion Playbooks list**

Find this exact block near the top of the file:

```markdown
9. `docs/operations/TENANT_LIVE_TEST_RUNBOOK.md`
10. Printify (print-on-demand ecommerce) – feature playbook TBD
```

Replace it with:

```markdown
9. `docs/operations/TENANT_LIVE_TEST_RUNBOOK.md`
10. Printify (print-on-demand ecommerce) – feature playbook TBD
11. `ONBOARDING_CALL_SCRIPT.md` – pre-Step-6 client onboarding call, access checklist
```

- [ ] **Step 2: Point to the call script right before Step 6**

Find this exact block:

```markdown
Expected result:

1. Subsequent onboarding and settings work against the selected tenant.

## Step 6 - Run Onboarding
```

Replace it with:

```markdown
Expected result:

1. Subsequent onboarding and settings work against the selected tenant.

> **Before Step 6:** complete the client onboarding call. Follow
> `ONBOARDING_CALL_SCRIPT.md` for the call-day access checklist and script.
> Google Analytics and Search Console are handled separately, after launch
> — see Step 11.

## Step 6 - Run Onboarding
```

- [ ] **Step 3: Add the post-launch analytics step to Step 11**

Find this exact block:

```markdown
3. Payments
   1. configure payment-related setup
   2. verify Stripe-related status if applicable

Expected result:

1. Every tenant has a working public URL, either the auto-assigned preview or a custom domain.
2. Optional operational systems are configured only where sold.
```

Replace it with:

```markdown
3. Payments
   1. configure payment-related setup
   2. verify Stripe-related status if applicable
4. Post-Launch Analytics (Google Analytics + Search Console)
   1. Confirm the domain status is `active` (from the Domain step above) —
      this step only starts once that's true. If the tenant is launching on
      the free `{slug}.rctechbridge.com` preview URL with no custom domain
      planned, skip this step for now and revisit once a custom domain is
      added.
   2. Send the client the GA4 + Search Console setup email using the
      template in `POST_LAUNCH_GA_GSC_EMAIL_TEMPLATE.md`.
   3. Once the client confirms `rctechsolutions1@gmail.com` has been added
      as GA4 Editor and Search Console full user, record
      `NEXT_PUBLIC_GA_MEASUREMENT_ID` in the client's `agency-toolkit-template`
      `.env.local` and the Search Console property URL in the `ads-mcp`
      config, per `backend-rc/README.md`'s "Onboarding New Tenants" section.

Expected result:

1. Every tenant has a working public URL, either the auto-assigned preview or a custom domain.
2. Optional operational systems are configured only where sold.
3. Google Analytics and Search Console access is confirmed once the domain is live.
```

- [ ] **Step 4: Verify all three edits landed**

Run:

```bash
grep -n "ONBOARDING_CALL_SCRIPT.md" docs/guides/TENANT_ONBOARDING_RUNBOOK.md
grep -n "Post-Launch Analytics" docs/guides/TENANT_ONBOARDING_RUNBOOK.md
grep -n "POST_LAUNCH_GA_GSC_EMAIL_TEMPLATE.md" docs/guides/TENANT_ONBOARDING_RUNBOOK.md
```

Expected: each command prints at least one matching line (two for the first, since it appears in both the companion-playbooks list and the pre-Step-6 note).

- [ ] **Step 5: Commit**

```bash
git add docs/guides/TENANT_ONBOARDING_RUNBOOK.md
git commit -m "docs: link onboarding call script and post-launch analytics step into runbook"
```

---

### Task 2: Write the onboarding call script

**Files:**
- Create: `admin-dashboard-rc/docs/guides/ONBOARDING_CALL_SCRIPT.md`

**Interfaces:**
- Consumes: nothing new — references `TENANT_ONBOARDING_RUNBOOK.md` (Task 1), `POST_LAUNCH_GA_GSC_EMAIL_TEMPLATE.md` (Task 3), and the design spec, all by filename only.
- Produces: the filename `ONBOARDING_CALL_SCRIPT.md`, which Task 1's edits already reference.

- [ ] **Step 1: Create the file with this exact content**

```markdown
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
```

- [ ] **Step 2: Verify the file was created correctly**

Run:

```bash
grep -c "^### " docs/guides/ONBOARDING_CALL_SCRIPT.md
grep -n "rctechsolutions1@gmail.com" docs/guides/ONBOARDING_CALL_SCRIPT.md
```

Expected: the first command prints `8` (eight numbered call-sequence
subsections); the second prints at least three matching lines (GBP,
Stripe Support Specialist, and the call-sequence intro).

- [ ] **Step 3: Commit**

```bash
git add docs/guides/ONBOARDING_CALL_SCRIPT.md
git commit -m "docs: add client onboarding call script"
```

---

### Task 3: Write the post-launch GA4/Search Console email template

**Files:**
- Create: `admin-dashboard-rc/docs/guides/POST_LAUNCH_GA_GSC_EMAIL_TEMPLATE.md`

**Interfaces:**
- Consumes: nothing new.
- Produces: the filename `POST_LAUNCH_GA_GSC_EMAIL_TEMPLATE.md`, which Task 1's Step 11 edit and Task 2's script already reference.

- [ ] **Step 1: Create the file with this exact content**

```markdown
# Post-Launch Google Analytics & Search Console Email Template

Audience: internal admin employees
Status: Active
Trigger: send once a tenant's domain shows `active` in
`Global Site Settings`, per `TENANT_ONBOARDING_RUNBOOK.md` Step 11.4.

## Subject

Your website is live — let's connect Google Analytics and Search Console

## Body

```
Hi {{owner_name}},

Great news — {{business_name}}'s website is live at {{domain}}.

Two quick things to finish setting up so we can track your site's
performance and help it show up better in Google search:

1. Google Analytics (GA4)
   - Go to https://analytics.google.com and create a property for
     {{domain}} if you don't already have one (or open your existing one).
   - Go to Admin → Property Access Management → Add users.
   - Add rctechsolutions1@gmail.com with the Editor role.
   - Reply to this email with your GA4 Measurement ID (starts with "G-"),
     found under Admin → Data Streams → your web stream.

2. Google Search Console
   - Go to https://search.google.com/search-console and add a property
     for {{domain}}.
   - Go to Settings → Users and permissions → Add user.
   - Add rctechsolutions1@gmail.com as a Full user.

Once both are done, just reply and let us know — we'll take it from there.

Thanks,
RD Tech Bridge
```

## Placeholders

- `{{owner_name}}` — tenant owner's name, from the tenant record.
- `{{business_name}}` — tenant's business name, from the tenant record.
- `{{domain}}` — the tenant's now-verified custom domain (or preview URL,
  if applicable).

## Sending

No automated send path exists for this yet (per
`docs/superpowers/specs/2026-08-03-onboarding-call-access-checklist-design.md`,
this is an ops/process spec with no code changes). Admin sends this
manually from their own email client, filling in the placeholders above.
```

- [ ] **Step 2: Verify the file was created correctly**

Run:

```bash
grep -n "rctechsolutions1@gmail.com" docs/guides/POST_LAUNCH_GA_GSC_EMAIL_TEMPLATE.md
grep -c "{{" docs/guides/POST_LAUNCH_GA_GSC_EMAIL_TEMPLATE.md
```

Expected: first command prints 2 matching lines (GA4 Editor, GSC Full
user); second command prints `4` or more (the three named placeholders,
counting each usage).

- [ ] **Step 3: Commit**

```bash
git add docs/guides/POST_LAUNCH_GA_GSC_EMAIL_TEMPLATE.md
git commit -m "docs: add post-launch GA4/Search Console email template"
```

---

### Task 4: Write the agency ad-platform manual setup checklist

**Files:**
- Create: `admin-dashboard-rc/docs/guides/AGENCY_AD_PLATFORM_SETUP_CHECKLIST.md`

**Interfaces:**
- Consumes: nothing new.
- Produces: the filename `AGENCY_AD_PLATFORM_SETUP_CHECKLIST.md`, which Task 2's script references.

**Important:** this task's deliverable is the checklist document itself.
The checkboxes inside it describe real-world account creation in the
Google Ads and Meta Business Manager consoles that only an authorized
human at RD Tech Bridge can perform — no engineer or agent can complete
them from this repo. Do not mark those checkboxes done as part of
"finishing" this task; only creating and committing the checklist file is
in scope here.

- [ ] **Step 1: Create the file with this exact content**

```markdown
# Agency Ad Platform Setup Checklist (One-Time, Manual)

Audience: internal admin employees / agency owner
Status: Needs completion — these are one-time setup actions outside any
codebase in this repo. An engineer or agent cannot complete these steps;
they require an authorized person to sign into Google Ads and Meta
Business Manager directly.

These accounts must exist before the "Google Ads / Meta Ads — confirm
only" step in `ONBOARDING_CALL_SCRIPT.md` can send a link/partner request
ahead of any client's onboarding call. Complete once, not per-client.

## Google Ads Manager (MCC) account

- [ ] Go to https://ads.google.com/home/tools/manager-accounts/ and
      create an MCC account for RD Tech Bridge, if one doesn't already
      exist.
- [ ] Record the resulting Manager Customer ID (format `XXX-XXX-XXXX`).
- [ ] Store the Manager Customer ID wherever `ads-mcp` credentials are
      currently stored (see `backend-rc/README.md`'s "Onboarding New
      Tenants" section for the existing per-client credential pattern).

## Meta Business Manager account

- [ ] Go to https://business.facebook.com and create a Business Manager
      account for RD Tech Bridge, if one doesn't already exist.
- [ ] Record the resulting Business Manager ID (Business Settings →
      Business Info).
- [ ] Store the Business Manager ID alongside the Google Ads Manager
      Customer ID above.

## Verification

- [ ] Confirm both IDs are documented somewhere the admin running
      `ONBOARDING_CALL_SCRIPT.md`'s "Before the call" steps can find them.

Once both accounts exist and their IDs are recorded, the "Before the
call" steps in `ONBOARDING_CALL_SCRIPT.md` (sending the MCC link request
/ Meta partner request) become actionable for any client with the Ads
module.
```

- [ ] **Step 2: Verify the file was created correctly**

Run:

```bash
grep -c "^- \[ \]" docs/guides/AGENCY_AD_PLATFORM_SETUP_CHECKLIST.md
```

Expected: prints `7` (seven unchecked checklist items).

- [ ] **Step 3: Commit**

```bash
git add docs/guides/AGENCY_AD_PLATFORM_SETUP_CHECKLIST.md
git commit -m "docs: add agency ad platform manual setup checklist"
```

---

## After all tasks

Once Tasks 1-4 are committed, open a PR (per `CLAUDE.md`'s branch/PR
convention — this repo's hook refuses direct commits to `main`) covering
all four commits together, since they're one cohesive doc set. Note in
the PR description that Task 4's checklist items are unchecked by design
and are a follow-up action item for whoever owns the agency's Google
Ads/Meta accounts.
