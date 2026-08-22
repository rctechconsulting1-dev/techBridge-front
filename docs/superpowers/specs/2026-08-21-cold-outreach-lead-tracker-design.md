# Cold Outreach Lead Tracker

Date: 2026-08-21
Status: Draft, pending implementation planning
Repos affected: `admin-dashboard-rc` (new admin UI, new API routes, new outreach templates) and `backend-rc` (new `leads`/`lead_touches` tables and routes).

## Purpose

RD Tech Bridge wants to run cold outreach against small/new businesses found through manual browsing — Craigslist ads, Facebook/Instagram ads, Google Maps search results, and new contractor licenses from CSLB — without either (a) building a full CRM, or (b) losing track of who's already been contacted and duplicating outreach. There is no automated scraping anywhere in this design: every lead starts as text a person copied by hand from one of those sources, or a CSLB search result pasted the same way. The system's job is to turn that raw pasted text into tracked lead records, prevent double-contact (including never cold-emailing an existing tenant or prospect already in the system), and send a personalized first-touch email through the Resend integration this repo already has.

## Context: what exists today

- `src/lib/resend-client.ts` — shared `Resend` singleton, already used by every transactional email in this repo (`src/lib/email.ts`). New sends reuse this client rather than creating a second one.
- `src/lib/email-templates.ts` — existing HTML email templates (welcome, verify, billing invite, etc.) all wrap content in a branded HTML layout via `layout()`. Cold outreach emails must NOT use this — they need to read as personal plain text, not a branded blast. This design adds a separate, plain-text template module rather than extending `email-templates.ts`.
- `src/app/api/content-agent/route.ts` — existing pattern for calling an AI model from an admin-dashboard-rc API route. The new lead-parsing endpoint follows this same pattern rather than introducing a new AI integration approach.
- `backend-rc/routes/tenantProspects.js` — the existing admin-only prospect flow (`authMiddleware, requireAdminRole`) for people who have already agreed to a plan and are mid-onboarding. This is a different concept from a cold lead (no plan chosen, no agreement yet) and is not extended by this design — it's only used as a cross-check target (see Deduplication below) so a cold lead who is already a `tenant_prospect` or active tenant never gets a cold email.
- No test runner exists in either repo (confirmed by the most recent spec in this directory) — verification is `tsc --noEmit` plus manual exercise.

## Data model (new, in `backend-rc`)

### `leads`

| Field | Notes |
|---|---|
| `id` | |
| `business_name` | required |
| `contact_name` | nullable — rarely present at capture time |
| `email` | nullable |
| `phone` | nullable |
| `website_url` | nullable — copy/paste from Google Maps captures only a "has a website" signal, not the actual URL (the link's href isn't part of the copied text), so this is usually filled in later by hand |
| `license_number` | nullable, CSLB-sourced leads only; unique when present — the most reliable dedup key this system has |
| `source` | enum: `google_maps`, `facebook`, `instagram`, `craigslist`, `cslb` |
| `trade` | free text (e.g. "Electrical", "Painting") |
| `city` | free text |
| `tier` | enum: `small`, `medium` — drives which email body is used; `large` is explicitly out of scope (see below) |
| `rating` | nullable numeric |
| `review_count` | nullable integer |
| `status` | enum: `new`, `needs_email_lookup`, `ready_to_send`, `contacted`, `responded`, `not_interested`, `converted`, `do_not_contact` |
| `notes` | free text |
| `raw_source_text` | nullable — the original pasted text, kept for audit and re-parsing if the parser improves later |
| `created_at`, `updated_at` | |

`status` starts at `ready_to_send` when an email is present at save time, `needs_email_lookup` otherwise. `do_not_contact` is also set automatically (never manually skippable) when the tenant/prospect cross-check below finds a match.

### `lead_touches`

One row per outreach attempt, so a lead's full history is visible regardless of which channel was used (a lead can be both emailed and called over time — a single `status` field can't represent that).

| Field | Notes |
|---|---|
| `id` | |
| `lead_id` | FK |
| `channel` | enum: `email`, `call`, `text` |
| `template_opener`, `template_tier` | nullable, email only — which source-opener/tier-body combo was actually sent |
| `resend_message_id` | nullable, email only |
| `outcome_notes` | nullable, call/text only — logged by hand after the call/text happens (no automated SMS/dialing in this design) |
| `created_at` | |

## Lead capture: one unified paste-and-parse flow

The real CSLB and Google Maps samples gathered while designing this turned out to have the same shape as far as the system is concerned: a block of pasted text containing one or more businesses, with some fields present and others missing depending on source. So capture is a single feature, not five separate importers:

1. A paste box, a `source` dropdown (`google_maps` / `facebook` / `instagram` / `craigslist` / `cslb`), and batch-level fields that apply to every row extracted from that paste: `trade`, `tier`, and `city` (CSLB rows include city per-row already; Maps/FB/IG results don't include city in the copied text at all, so it's supplied once per paste either way).
2. "Parse" calls a new AI parsing endpoint (`src/app/api/leads/parse/route.ts`, following the `content-agent` pattern) with the raw text and `source`. The prompt is source-aware: CSLB text is column-shaped (license number, business name, address, city, zip, phone — no email, no trade per row); Google Maps text is a repeating listing block (name, category, rating, review count, phone, an "is sponsored" flag, sometimes a review quote, sometimes a bare "Website" label with no URL); Facebook/Instagram/Craigslist text is the least structured (ad copy, page/post name, rarely phone or address) and should be treated as best-effort extraction, not something to force into full fields.
3. The parser returns an array of draft leads — never writes to the database directly. The UI shows them in an editable table: every field editable, obviously-wrong or empty rows easy to delete, before anything is saved. A parse failure on a row (garbled text the model can't extract from) surfaces the raw text back with empty fields rather than guessing.
4. Within that same draft batch, duplicate businesses are flagged before save (Google Maps result pages can list the same business twice).
5. On confirm, the batch POSTs to `backend-rc`'s `POST /leads` (bulk create). Each row runs the deduplication checks below server-side before insert.

CSLB's own site (`ZipCodeSearch.aspx` and the license-check search) is government infrastructure searched and exported by hand — this design never automates a request to it. The "file import" idea from earlier in this design's discussion is dropped in favor of the same paste flow, since that's how the actual CSLB data arrives in practice.

## Deduplication

Three checks, all server-side in the `POST /leads` handler, none of them hard blocks except the tenant/prospect one:

1. **Within the batch being saved** — fuzzy match on `business_name` (+`phone` if present) across the rows in this request; flagged in the preview table before the request is even sent.
2. **Against existing `leads`** — exact match on `email` or `license_number` when present, fuzzy match on `business_name` + `city` otherwise. Surfaces as a warning ("looks like an existing lead from `<source>`, added `<date>`") that can be saved-anyway, since the same business can legitimately turn up via two different sources.
3. **Against `tenants` / `tenant_prospects` in `backend-rc`** — when a row has an email, normalize it and check both tables the same way `tenantProspects.js` already does for its own duplicate checks. A match means this business is already a customer or already mid-onboarding through the existing flow — the row is still saved (so it's visible and explains why), but `status` is force-set to `do_not_contact` and cannot be changed by the paste-time UI. Because many leads don't have an email until you look one up later, this same check runs again as a hard gate inside the send-email endpoint (below) — the last line of defense right before anything actually gets sent.

## Templates

New plain-text module, `src/lib/outreach-templates.ts` (deliberately not part of `email-templates.ts`'s branded-HTML `layout()` — cold outreach needs to read as a real person's email):

- Four **openers**, one per `source`, each a single personalized line referencing what was seen (the specific ad, the specific license/trade).
- Two **bodies**, one per `tier`:
  - `small` — the pitch is a real website; pain point is looking unfinished or not being found.
  - `medium` — the pitch is a website plus one concrete time-saving workflow/agent idea named for their trade; pain point is manual repetitive work (missed calls, manual follow-up/scheduling).
- A shared CTA ("reply and I'll send you the mockup"), signature, and a compliance footer (physical mailing address + opt-out line, required by CAN-SPAM even for B2B cold email) appended to every send automatically — not editable out.
- `buildOutreachEmail({ source, tier, mergeFields })` composes opener + body + shared close into the final plain-text string with merge fields substituted.

The mockup image itself (logo/name/accent-color swapped into a template, under 2 minutes per lead, per the earlier effort-budget decision) stays a manual step outside the dashboard — attached to the email at send time. Automating mockup generation was explicitly deferred, not designed here.

## Sending

- New admin page, `src/app/(admin)/(others-pages)/leads/page.tsx` — the tracker: filterable by `status`/`source`/`tier`, columns for business name, contact info, status, last touch (channel + date), rating.
- Row action **Send email**: opens `buildOutreachEmail(...)` pre-filled and editable, attaches the mockup image manually, sends via the existing `getResendClient()` as plain text (no HTML layout). New route `src/app/api/email/lead-outreach/route.ts` runs the tenant/prospect gate check one more time server-side before calling Resend, then calls `backend-rc`'s `POST /leads/:id/touches` (`channel: "email"`) and `PATCH /leads/:id` (`status: "contacted"`).
- Row action **Log call/text**: a small form (outcome notes) that creates a `lead_touches` row with `channel: "call"` or `"text"` and advances `status` to `contacted` (or directly to `responded`/`not_interested` if already known).
- Row action **Update status**: manual override to `responded` / `not_interested` / `converted` / `do_not_contact`, for when you learn something outside the tracker (an email reply in your inbox, a text back).

## Error handling

| Failure | Behavior |
|---|---|
| AI parse can't extract fields from a row | Row shown with raw text intact, fields empty — never guessed/fabricated |
| Duplicate within the batch or against existing `leads` | Warning shown in the preview table, save-anyway allowed |
| Row's email matches an existing tenant/prospect | Row saved with `status` forced to `do_not_contact`, not user-editable at save time |
| Send-time tenant/prospect gate matches (should be rare — already caught at save) | Send blocked, error shown, no email sent, no `lead_touches` row created |
| Resend send failure | Error surfaced in the UI, no `lead_touches` row created, `status` unchanged, retryable |
| CSLB/Maps paste text with unexpected shape | Parser falls back to best-effort/empty fields rather than failing the whole batch |

## Out of scope

- Any automated scraping of Google Maps, Facebook, Instagram, Craigslist, or CSLB — every input is manually copied by a person. Facebook/Instagram scraping specifically would violate their ToS.
- Automated SMS/dialing — call and text are manually performed and manually logged.
- A `large`-tier pitch/template — none of the four lead sources organically surface large companies; revisit if a future lead source does.
- Automated mockup-image generation — stays a manual Canva-style swap per lead.
- CSV/Excel file upload — dropped in favor of the paste flow, which is how the actual CSLB and Maps data was demonstrated.
- Full CRM features (pipelines, reporting dashboards, multi-user assignment) — this is a tracker, not a CRM, per the explicit "keep it minimal" goal.

## Testing approach

No test runner in either repo. Verification is `tsc --noEmit` (admin-dashboard-rc) plus manual exercise: paste a real CSLB block and confirm license number/business name/address/city/phone extract correctly with trade/tier applied from the batch fields; paste a real Google Maps results block and confirm multiple businesses extract with the in-batch duplicate ("Hernandez Painting Special" appearing twice) flagged; save a batch containing an email that matches an existing tenant and confirm it lands as `do_not_contact` and cannot be sent to; send a real test email via Resend's test mode and confirm a `lead_touches` row appears and `status` advances to `contacted`; confirm the compliance footer is present and not strippable from the composer.
