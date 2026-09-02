# Cold Calling Lead Workflow

Date: 2026-09-01
Status: Draft, pending implementation planning
Repos affected: `admin-dashboard-rc` (leads page, lead modal, outreach templates, API client, sidebar badge, new CSV import flow) and `backend-rc` (migration on `outreach_leads` / `outreach_lead_touches`, `outreachLeads.js` route changes, one shared constant).

## Purpose

The existing cold outreach system (`docs/superpowers/specs/2026-08-21-cold-outreach-lead-tracker-design.md`) is email-first: capture pasted leads, look up an email, send one branded-plain-text pitch, log the odd call by hand. RD Tech Bridge now wants to run the cold-calling playbook from `https://getmapleads.io/blog/how-to-get-web-design-clients-through-cold-calling`: build a list of local businesses with no website, call the highest-reviewed first, log a structured call outcome, book a callback, and get reminded so warm leads do not go cold. Most closes happen on the second or third contact, so the callback loop is the point of the whole change.

This spec reshapes the pipeline from a single email-shaped `status` field into an explicit call-first `stage` machine, adds callback scheduling with an in-app "due" surface, adds a CSV import path for lists produced by a browser extension, and adds a per-lead call script. It deliberately stops short of a full CRM.

## Scope decisions (settled during brainstorming)

- **Calling workflow + scheduling only.** No KPI/session-metrics dashboard, no AI website-audit PDF. Both are noted in "Out of scope" for a later spec.
- **Sourcing is CSV import only.** The operator runs a Google Maps scraper browser extension themselves, exports a CSV, and uploads it. Nothing in the codebase scrapes Google or calls a Google API for sourcing. This reverses nothing in the prior spec's stance (that spec refused automated scraping); it keeps scraping out of the codebase entirely by making the operator's tool their own choice.
- **Solo operator.** No assignee column, no per-caller stats, no leaderboard.
- **In-app reminders only.** A "follow-ups due" view plus a sidebar badge. No email digest, no per-callback email, no calendar integration, no `.ics` export. Revisit only if callbacks are missed in practice.

## Context: what exists today

- `backend-rc/routes/outreachLeads.js` — `POST /outreach-leads` (bulk create with dedup + tenant/prospect gate), `GET /` (filter by `status`/`source`/`tier`, paginated), `GET /:id` (with a pre-send self-heal that can force `do_not_contact`), `PATCH /:id`, `POST /:id/touches`, `GET /:id/touches`. All `authMiddleware, requireAdminRole`.
- `backend-rc/lib/outreachLeadHelpers.js` — `findExistingTenantOrProspect`, `findDuplicateLead`.
- `backend-rc/migrations/1783700000000_add-outreach-leads-tables.js` — the current schema. Migration filenames are epoch-ms prefixed; the next is `1783800000000_*`.
- `src/app/(admin)/(others-pages)/leads/page.tsx` — the tracker table, filters by `status`/`source`/`tier`, `LeadCaptureModal` + `LeadActionsModal`.
- `src/components/leads/LeadCaptureModal.tsx` — paste box, `source`/`tier`/`trade`/`city` batch fields, calls `POST /api/leads/parse` (AI), editable draft table, in-batch duplicate flag, bulk save.
- `src/components/leads/LeadActionsModal.tsx` — email entry + send, "investigate" (Google Places lookup for website/email), log call/text (free-text notes), manual status update.
- `src/lib/outreach-templates.ts` — `buildOutreachEmail`, `complianceFooter` (throws if `OUTREACH_COMPLIANCE_ADDRESS` unset), `OPENERS` per source, `BODIES` per tier.
- `src/app/api/leads/investigate/route.ts` — verifies caller via backend `/auth/me`, rate-limited, uses `GOOGLE_API_KEY` + Places API to find a website then scrape it for an email. Unchanged by this spec.
- `src/lib/api-client.ts` — `getOutreachLeads`, `getOutreachLead`, `createOutreachLeads`, `updateOutreachLead`, `logOutreachTouch`, `getOutreachLeadTouches`, `sendLeadOutreachEmail`.
- `src/layout/AppSidebar.tsx` — flat nav item `{ name: "Leads", path: "/leads", requiredRoles: ["admin","platform_admin"] }`. Badge markup currently exists only for `subItems` (`new` / `pro` pills), not flat items.
- No test runner in either repo. Verification is `tsc --noEmit` plus manual exercise.

## Data model changes (`backend-rc`)

New migration `1783800000000_add-outreach-lead-calling.js`.

### `outreach_leads`

Add:

| Column | Type | Notes |
|---|---|---|
| `stage` | text, NOT NULL | see stage machine below; replaces `status` |
| `next_action_at` | timestamptz, nullable | the booked callback time |
| `next_action_note` | text, nullable | free text ("ask for Dave, prefers mornings") |
| `attempt_count` | integer, NOT NULL, default 0 | call attempts that did not reach a person |

Migrate then drop `status`:

| old `status` | new `stage` |
|---|---|
| `new`, `needs_email_lookup` | `new` |
| `ready_to_send` | `qualified` |
| `contacted` | `attempting` |
| `responded` | `interested` |
| `not_interested` | `lost` |
| `converted` | `won` |
| `do_not_contact` | `do_not_contact` |

`status` is dropped in the same migration. The system is solo with a low row count, so a clean cut is safer than carrying two overlapping fields. The migration's `down` recreates `status` and reverses the mapping (best-effort: `callback_scheduled` and `disqualified` both map back to `new`).

`source`: add `csv_import` to the allowed set (`SOURCES` in `outreachLeads.js`, `SOURCE_OPTIONS` in the frontend).

Contact-readiness is now **derived, never stored**:
- needs an email lookup iff `email IS NULL`
- ready for the examples email iff `email IS NOT NULL AND stage IN ('interested','examples_sent')`

### `outreach_lead_touches`

Add `call_outcome` text, nullable, populated for `channel = 'call'` only. Allowed values: `no_answer`, `voicemail`, `gatekeeper`, `wrong_number`, `interested`, `callback`, `not_interested`.

### Shared constant

`MIN_QUALIFYING_REVIEWS` (default `10`, from the article) added alongside the existing retention constant in `backend-rc`. One-line tunable. Used only at CSV import time to compute the initial stage.

## Stage machine

Stages:

| Stage | Meaning |
|---|---|
| `new` | imported, not yet assessed (has a website unknown, or too few reviews to auto-qualify) |
| `qualified` | no website on file, `review_count >= MIN_QUALIFYING_REVIEWS`, not permanently closed — a call target |
| `disqualified` | has a website, or wrong number, or closed — kept for the record, filterable, not called |
| `attempting` | at least one call attempt, no person reached yet |
| `callback_scheduled` | reached someone (or a gatekeeper) and a callback time is booked |
| `interested` | reached a decision-maker who wants to see examples |
| `examples_sent` | the examples email has been sent |
| `won` | closed |
| `lost` | declined, or unreachable after repeated attempts (operator's judgement) |
| `do_not_contact` | email matches an existing tenant or prospect; hard gate, set only by the server, never by the UI |

Terminal for automation: `won`, `lost`, `disqualified`, `do_not_contact`. The stage machine only auto-advances a lead out of a non-terminal stage. A manual "Update stage" override in the modal can move a lead anywhere except into or out of `do_not_contact`.

### Transitions on logging a call (`POST /outreach-leads/:id/touches`, `channel = 'call'`)

| `call_outcome` | resulting `stage` | side effects |
|---|---|---|
| `no_answer`, `voicemail`, `gatekeeper` | `attempting` | `attempt_count += 1` |
| `wrong_number` | `disqualified` | append a note |
| `callback` | `callback_scheduled` | request body must include `nextActionAt` (and optional `nextActionNote`); 400 if absent |
| `interested` | `interested` | clear `next_action_at` / `next_action_note` |
| `not_interested` | `lost` | - |

If the lead is already terminal, the touch is still recorded but `stage` is left unchanged (mirrors today's behaviour where terminal statuses are not auto-advanced).

`channel = 'text'` keeps today's behaviour: record the touch, no `call_outcome`, advance `new` to `attempting` only.

### Transition on sending the examples email

The email send route (`src/app/api/email/lead-outreach/route.ts` and `sendLeadOutreachEmail`) currently advances to `contacted`. It now advances the lead to `examples_sent`, and only from `interested` or `examples_sent` (a re-send). The `do_not_contact` gate in `POST /:id/touches` and the send route is unchanged.

## CSV import + qualification

The AI paste flow (`LeadCaptureModal` + `POST /api/leads/parse`) stays for `google_maps` / `facebook` / `instagram` / `craigslist` / `cslb`. CSV import is a new path for the `csv_import` source.

New component `src/components/leads/LeadCsvImportModal.tsx`, opened from a second button ("Import CSV") on the leads page:

1. **Upload** a `.csv` file. Parsed **client-side** — no AI, no server round trip for parsing. Use a small dependency-free CSV parse (handle quoted fields, commas in values, a header row). Cap at 500 rows per import; warn and refuse above that.
2. **Column mapping.** Auto-guess each of our fields from the header text (case-insensitive `includes`):
   - `business_name` ← `name`, `business`, `title`
   - `phone` ← `phone`, `telephone`
   - `website_url` ← `website`, `site`, `url`, `domain`
   - `rating` ← `rating`, `stars`, `score`
   - `review_count` ← `reviews`, `review_count`, `ratings`, `user_ratings`
   - `city` ← `city`, `town`
   Show the resolved mapping with a dropdown per field so the operator can correct a wrong guess or set one to "(none)". `business_name` is required; the others are optional.
3. **Batch fields**, same as the paste flow: `trade`, `tier`, and `city` (the batch `city` is used only for rows where the mapped city column is empty or unmapped).
4. **Preview table** reusing the existing in-batch duplicate flag (case/whitespace-insensitive `business_name` match). Rows editable and removable before save.
5. **Save** via the existing `POST /outreach-leads` with `source: "csv_import"`. No new endpoint. Server-side dedup and the tenant/prospect gate are unchanged.

### Initial stage on insert (`POST /outreach-leads`)

The route currently sets `status` to `do_not_contact` / `ready_to_send` / `needs_email_lookup`. Replace with `stage`:

1. email matches a tenant or prospect → `do_not_contact` (unchanged gate, unchanged forced note)
2. else `website_url` present and non-empty → `disqualified`
3. else `review_count` is a number `>= MIN_QUALIFYING_REVIEWS` → `qualified`
4. else → `new`

"Closed" businesses are not detected — CSV exports rarely carry that field, and a manual "Update stage" to `disqualified` covers the occasional one. The article's third qualifier ("reviewed in the last 12 months") is deliberately not implemented: the review date is almost never in an extension export, so it would be a mostly-empty column driving nothing. `review_count >= MIN_QUALIFYING_REVIEWS` is the proxy.

This runs for every source, not just CSV. For the AI paste sources the effect is: a Google Maps lead with a "Website" label but no reviews lands in `new`, a well-reviewed no-website lead lands in `qualified` ready to call.

## Call script

New pure function in `src/lib/outreach-templates.ts`:

```
buildCallScript(lead): { opener: string; pitch: string[]; objections: { objection: string; response: string }[] }
```

No AI, no backend, no network. Merge fields from the lead (`business_name`, `review_count`, `trade`, `city`; each has a sensible fallback phrase when null).

- **opener** — the article's opening line: greeting + business name check + the "{review_count} reviews on Google Maps" + "noticed you don't have a website yet" + "I build sites for {trade} in {city}" + "is now a bad time for a two-minute chat?"
- **pitch** — three bullets: what you do, a comparable local client, the ask ("can I send you a couple of examples — would {a suggested weekday} work?").
- **objections** — the article's five, as static objection/response pairs:
  - "Don't need a website" → show what a search for their service in their city returns
  - "I get work by word of mouth" → a site is where referrals check you out before calling
  - "Already building one" → happy to be a second pair of eyes on it
  - "How much?" → let me send examples first, then we can talk numbers
  - "Just email me" → get the email, send the audit/examples, book a time to talk

Rendered read-only in `LeadActionsModal`.

## UI changes (`admin-dashboard-rc`)

### `leads/page.tsx`

- `OutreachLead` type: `status` → `stage`; add `next_action_at`, `next_action_note`, `attempt_count`.
- Filter dropdown: `STATUS_OPTIONS` → `STAGE_OPTIONS` (the ten stages).
- Add `SOURCE_OPTIONS` entry `csv_import`.
- New **"Follow-ups due"** toggle. When on, the list requests `dueOnly=true` and sorts by `next_action_at` asc.
- Default list sort (toggle off): `stage = qualified` rows first ordered by `review_count` desc (the article's "call the highest-reviewed first"), then all other rows by `created_at` desc.
- Table columns: add **Phone** (primary for calling), **Next action** (date + truncated note), **Attempts**. Keep Business, Source, Tier, Stage, Rating.
- Second header button **"Import CSV"** next to "Capture leads".

### `LeadActionsModal.tsx`

Reordered top to bottom:

1. **Call script** — `buildCallScript(lead)` output: opener, pitch bullets, objection card. Read-only.
2. **Call history** — timeline of past touches for this lead, newest first: date, channel, `call_outcome` (labelled), `outcome_notes`, and for email touches the `template_tier` / `resend_message_id`. Fetched via the existing `getOutreachLeadTouches(lead.id)` (`GET /outreach-leads/:id/touches`, already returns `SELECT *` so `call_outcome` is included once the column exists). Loaded on modal open and refetched by the existing `refreshActionLead` flow after any new touch. Shows "No calls or emails logged yet" when empty.
3. **Log a call** — channel select (`call` / `text`); for `call`, a `call_outcome` dropdown. When `call_outcome = callback`, reveal a datetime input (`next_action_at`, required) and a note input. Submit calls `logOutreachTouch` with the new fields. On success the modal refreshes (existing `refreshActionLead` flow).
3. **Reschedule follow-up** — standalone datetime + note, `PATCH /:id` with `nextActionAt` / `nextActionNote`. Visible whenever `stage` is non-terminal.
4. **Examples email** — the existing email entry + composer + send. Shown only when `stage IN ('interested','examples_sent')`. When `stage` is earlier, show a hint ("log an interested call to unlock the examples email"). `do_not_contact` shows the existing red block.
5. **Investigate** — unchanged (find website/email), still shown when `!email || !website_url`.
6. **Update stage** — manual override select. Options are every stage except `do_not_contact` (cannot be set or cleared from the UI).

### `AppSidebar.tsx`

Add optional numeric badge support to flat nav items (currently only `subItems` render pills). The "Leads" item shows the count from `getOutreachDueCount()` when `> 0`, styled like the existing `menu-dropdown-badge`. Fetched once on sidebar mount for admin roles; no polling.

### `api-client.ts`

- Update param and return types for `getOutreachLeads` (`stage` filter, `dueOnly`, sort), `updateOutreachLead` (`nextActionAt`, `nextActionNote`, `stage`), `logOutreachTouch` (`callOutcome`, `nextActionAt`, `nextActionNote`).
- Add `getOutreachDueCount(): Promise<{ count: number }>`.

## Backend route changes (`outreachLeads.js`)

- `SOURCES` add `csv_import`. Replace `STATUSES` with `STAGES`. Replace `SELF_HEAL_STATUSES` with `SELF_HEAL_STAGES` (`new`, `qualified`, `attempting`, `callback_scheduled`); the `GET /:id` self-heal still forces `do_not_contact` only from those non-contacted stages.
- `POST /` — initial stage logic above; still returns `{ created }` with `duplicateWarning` unchanged.
- `GET /` — `stage` filter instead of `status`; add `dueOnly` (`next_action_at IS NOT NULL AND next_action_at <= NOW() AND stage NOT IN ('won','lost','disqualified','do_not_contact')`); add `sort` (`reviews_desc` default, `next_action_asc` for the due view).
- `GET /due-count` — new, returns `{ count }` using the same `dueOnly` predicate.
- `PATCH /:id` — accept `nextActionAt` (nullable timestamptz), `nextActionNote`, `stage` (validated against `STAGES`, rejects `do_not_contact` from the client). Keep the existing "adding an email re-runs the tenant/prospect check" logic, retargeted to `stage`: if the added email matches a tenant/prospect, force `stage = do_not_contact`. Adding an email otherwise never changes `stage` — qualification is computed only at import time, and a lead's call-readiness does not depend on having an email.
- `POST /:id/touches` — the transition table above. Validate `call_outcome` against the allowed set when `channel = 'call'`. Require `nextActionAt` when `call_outcome = 'callback'` (400 `MISSING_CALLBACK_TIME` otherwise). Persist `call_outcome`, bump `attempt_count`, set/clear `next_action_*` per the table. Still returns `{ touch, lead }`.
- `GET /:id/touches` — handler unchanged; it is `SELECT *` so `call_outcome` is returned automatically once the column exists. This is what the modal's call-history timeline reads.

## Error handling

| Failure | Behaviour |
|---|---|
| CSV file is not parseable / has no header row | Import modal shows an error, nothing saved |
| CSV over 500 rows | Refused with a message to split the file |
| A required column (`business_name`) cannot be mapped | "Save" disabled until the operator maps it |
| `call_outcome = callback` submitted with no `nextActionAt` | 400, touch not created, stage unchanged |
| Manual stage override attempts `do_not_contact` | 400, rejected server-side |
| Examples email attempted while `stage` not in (`interested`,`examples_sent`) | Send button not shown; if forced via API, the send route returns 409 |
| `do_not_contact` lead, any send path | Blocked (unchanged) |
| `down` migration on a lead in `callback_scheduled` / `disqualified` | Maps back to `status = 'new'` (documented lossy reverse) |

## Out of scope

- KPI / session-metrics dashboard (calls per session, answer rate, interested/session, close rate). Deferred to a follow-up spec.
- AI website-audit PDF for the pre-callback step. Deferred.
- Any automated Google Maps / Places scraping or API calls for **sourcing**. The operator produces the CSV with their own browser extension. (`investigate`'s existing Places use for email lookup is unrelated and unchanged.)
- Multi-caller assignment, per-caller stats, leaderboard.
- "Call session" queue mode (walk the qualified list one lead at a time with a Next button). The sorted list plus the per-lead modal is enough for now; revisit if working the list becomes tedious.
- Email / push / calendar reminders, `.ics` export. In-app Due view + sidebar badge only.
- Automated dialing or SMS. Calls and texts are placed by hand and logged by hand.
- `large` tier. Still out, as in the prior spec.

## Testing approach

No test runner in either repo. Verification:

- `tsc --noEmit` in `admin-dashboard-rc`.
- Migration up on a copy of dev data: confirm every existing row gets a `stage`, `status` is gone, new columns default correctly. Migration down: confirm `status` returns with the reversed mapping.
- Import a real browser-extension CSV: confirm auto column mapping, a wrong guess is correctable, no-website + high-review rows land `qualified`, has-website rows land `disqualified`, an email matching a tenant lands `do_not_contact`.
- Log each `call_outcome` in turn against a test lead: confirm the stage transition, `attempt_count` increment, and `next_action_*` set/clear per the table; confirm `callback` with no time is rejected.
- Book a callback in the past: confirm it appears in the Due view and increments the sidebar badge; confirm a `won` lead with a stale `next_action_at` does not.
- Send the examples email from an `interested` lead: confirm a `lead_touches` row, `resend_message_id` recorded, `stage` → `examples_sent`.
- Confirm the compliance footer is still appended and non-strippable (unchanged path).
- Confirm `buildCallScript` renders with null `trade` / `city` / `review_count` without printing "null".
- Log two calls and an email on one lead, reopen the modal: confirm the call-history timeline shows all three newest-first with outcomes and notes.
