# Client Onboarding Process Design

Date: 2026-07-22
Status: Draft, pending implementation planning

## Purpose

Define the end-to-end onboarding process for a new client, from the moment a
sale closes to the moment they enter the existing tenant setup covered by
`docs/guides/TENANT_ONBOARDING_RUNBOOK.md`. This includes discovery, asset
collection, account access handoff, a video onboarding call, and a fallback
for clients without an existing logo.

This process is solo-operated (one person runs discovery, the call, and
follow-through) and assumes no dedicated CRM/project tracker exists yet —
Google Calendar, Google Drive, and the product's own `/intake` flow are the
system of record.

## Relationship to existing docs

- `TENANT_ONBOARDING_RUNBOOK.md` covers everything from tenant creation in
  the admin dashboard onward (Step 3 onward in that doc). This design covers
  everything *before and alongside* that: discovery, asset intake, account
  access, and the video call. Completion of this process is the entry
  condition for `TENANT_ONBOARDING_RUNBOOK.md` Step 6 ("Run Onboarding").
- `FIRST_CLIENT_LAUNCH_READINESS.md` documents that `/intake`
  (questionnaire + asset capture) is already implemented and fires
  automatically when a tenant is created. This design extends that flow
  rather than replacing it, except for file uploads (see below).

## Pipeline

```
Sales closes deal (business type + modules already decided during sales)
        |
        v
Admin creates tenant in admin-dashboard-rc  ---> TENANT_ONBOARDING_RUNBOOK.md Step 3
        |  (fires welcome + reset + intake emails automatically - existing behavior)
        |  (admin also creates a per-client Google Drive folder at this point)
        v
Client fills out /intake  (async, existing feature + new "Automation & Workflows" section)
   - business info, brand notes, contact, offerings, platforms, setup
   - uploads logo/photos/brand assets to the linked Google Drive folder (not through /intake)
   - NEW: what's manual/repetitive today, current tools, interest in automation add-ons
        |
        v
Admin reviews intake + Drive folder
   - if no logo: generate 2-3 AI logo options ahead of the call
   - assemble adaptive access-checklist from the modules this client bought
        v
Booking link sent (Google Calendar) -> client self-schedules the onboarding call
        v
Onboarding call (Zoom, remote control)
   - confirm/expand automation-discovery answers live
   - client shares screen; admin drives sign-ups/access grants for each checklist item
   - client types own passwords live (admin never sees/stores plaintext credentials)
   - DNS/domain pointing help if needed
   - review AI logo options, get direction or sign-off
        v
Post-call follow-through: confirm every checklist item done, chase anything missing
        v
Hand off to TENANT_ONBOARDING_RUNBOOK.md Step 6 onward
```

Onboarding is **complete** when: intake is submitted, the Drive folder has
what's needed (or a logo is in motion to fill the gap), every checklist
account is confirmed accessible, and the logo is finalized (uploaded or
AI-generated + approved).

## Stage detail

### 1. Discovery & asset intake

- Trigger: tenant creation in `admin-dashboard-rc`, immediately after the
  sale closes. This already fires welcome/reset/intake emails
  (`FIRST_CLIENT_LAUNCH_READINESS.md`, Phase 1).
- At the same moment, admin creates a per-client Google Drive folder
  (subfoldered: logo, photos, brand docs, testimonials) and its shareable
  link is woven into the intake form.
- `/intake` form changes (implementation task, `src/lib/intake-questions.ts`):
  - Replace the `logo`, `headshot`, and `work_photos` file/multifile
    questions with a single instructional text field: "Upload your logo,
    photos, and any brand assets to this folder: `[Drive link]`" — the
    client can add notes or confirm completion in the text answer.
  - Add a new **"Automation & Workflows"** section: what's manual/repetitive
    today, current tools in use, interest in automation-related add-ons
    (SMS, Custom AI Agent, Ads Optimization).
  - Everything else in intake is unchanged, including the existing async
    Google Business Profile access-grant pattern (client adds
    `rctechsolutions1@gmail.com` as Manager) — this remains the model for
    that one platform and is *not* part of the live-call checklist.
- Output: submitted intake (text answers) + Drive folder (files). Together
  these are the discovery record that informs the call agenda and the
  access-checklist.
- Default worth flagging: if intake isn't completed within roughly 2-3
  days, an automated reminder should go out before the booking link is
  withheld indefinitely. No reminder infrastructure exists yet — call out
  as an open item during implementation planning, not building it now.

### 2. Scheduling & pre-call prep

- Trigger: intake submission (mirrors the existing "Admin confirms latest
  intake exists" check in `FIRST_CLIENT_LAUNCH_READINESS.md`).
- Admin sends a Google Calendar self-service booking link once intake is in
  hand — the client picks their own slot.
- Before the call, admin:
  1. Reviews intake + Drive folder for completeness.
  2. If no logo was provided, generates 2-3 AI logo options (e.g. Looka or
     Canva AI) so they're ready to show live on the call.
  3. Assembles the adaptive access-checklist for this client, driven by the
     modules sold (module list per `TENANT_ONBOARDING_RUNBOOK.md` Step 3):
     e.g. Google Ads module -> Google Ads access; no domain pointed yet ->
     registrar access. Google Business Profile is excluded since it's
     handled async via intake.

### 3. The onboarding call

- Platform: Zoom, using its built-in remote-control feature (client shares
  screen and grants control) — no separate remote-access tool needed.
- Agenda:
  1. Quick discovery follow-up — clarify/expand on the Automation &
     Workflows answers from intake.
  2. Work through the access-checklist item by item: client navigates to
     each platform, admin drives the sign-up/access-grant steps. The
     client types any passwords themselves — admin never sees or stores
     plaintext credentials for accounts the client already owns. For any
     account that needs dedicated credentials for RD Tech Bridge to manage
     long-term, the client creates those live instead of sharing personal
     ones.
  3. DNS/domain pointing walkthrough if the client has an existing domain
     and wants hands-on help, rather than just being sent the DNS records
     per the existing runbook's async path.
  4. Logo: show AI-generated options if applicable, get a pick or
     direction for revisions.
- Output: every checklist item marked done or flagged for follow-up; logo
  direction decided.

### 4. Follow-through & handoff

- Admin chases any unresolved checklist items (missed access grants,
  pending DNS propagation, logo revisions) asynchronously after the call.
- Once everything is confirmed, admin proceeds into
  `TENANT_ONBOARDING_RUNBOOK.md` starting at Step 6 ("Run Onboarding").
  Intake data feeds Global Site Settings, the finalized logo goes into
  Branding, and purchased add-ons get configured using the access already
  granted on the call.

## Decisions and rationale

| Decision | Choice | Why |
|---|---|---|
| Scheduling | Google Calendar self-service booking link | Free, no new tool, client self-serves a slot |
| Discovery format | `/intake` (existing, extended) + live call follow-up | Reuses what's already built and emailed automatically; call only covers what intake can't (automation depth, live access grants) |
| Asset handling | Google Drive folder, not `/intake` file uploads | Explicit choice to keep asset files off the product's S3-backed upload path for now |
| Video call platform | Zoom with remote control | Single tool for both the conversation and driving the client's screen |
| Account access mechanism | Live call is primary | Chosen over extending the async GBP-style pattern to every platform |
| Credential handling | Client types live during screen share; new dedicated credentials created live where RD Tech Bridge needs long-term access | Avoids ever storing or seeing a client's personal plaintext passwords |
| Logo fallback | AI logo generator, run ahead of the call | Options ready to review live instead of generating cold on the call |
| Access checklist | Adaptive, built from the modules sold | Avoids walking every client through platforms irrelevant to their package |

## Out of scope

- Building onboarding features into `admin-dashboard-rc`'s existing
  Calendar or Asset Manager — deliberately deferred; this process runs on
  Google Calendar/Drive for now.
- Automated intake-completion reminders — flagged as an open default, not
  designed here.
- Any change to the existing async Google Business Profile access pattern.

## Implementation scope for the next phase

Code changes, all in `admin-dashboard-rc`:

1. `src/lib/intake-questions.ts` — replace `logo`, `headshot`, and
   `work_photos` file/multifile questions with a Drive-folder-link
   instructional text field; add the new "Automation & Workflows" section.
2. Intake email template — needs the per-client Drive folder link injected
   alongside the existing intake link.

Process/ops setup, no code:

1. Google Calendar booking page for the onboarding call.
2. Per-client Google Drive folder template (logo / photos / brand docs /
   testimonials subfolders).
3. Adaptive access-checklist template, keyed by module.
4. AI logo generator tool selection (Looka or Canva AI) and a short
   "review options" step in the call agenda.
