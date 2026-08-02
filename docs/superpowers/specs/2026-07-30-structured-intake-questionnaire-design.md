# Structured Intake Questionnaire (Kill AI Chat, Module-Aware Questions)

Date: 2026-07-30
Status: Draft, pending implementation planning
Repos affected: `admin-dashboard-rc` (frontend, intake schema, email links), `backend-rc` (new internal endpoint to expose a tenant's enabled modules)

## Purpose

The AI-assisted intake path (`/intake/ai`) is being replaced entirely by the existing classic form (`/intake`) as the only client-facing questionnaire. The classic form's questions are also being reworked: fewer open textareas, more boolean/select/multiselect, and the question set becomes aware of which plan modules a tenant actually purchased so the form only asks about features they bought. The goal is twofold — cleaner, more structured answers to seed the tenant's config (the site is ultimately built from a separately-deployed `agency-toolkit-template` clone, per `2026-07-28-admin-initiated-prospect-invite-design.md`'s note that `tenants` is primarily a CRM/ops record, not the site engine), and a tighter set of talking points for the account team's discovery call.

## Relationship to existing docs

- `2026-07-28-admin-initiated-prospect-invite-design.md` — this is the flow that creates the intake token in the first place (admin-initiated prospect invite). This spec changes what `createIntakeToken` embeds and which URL it's wrapped in, but doesn't change when/how invites are sent.
- `2026-07-22-client-onboarding-process-design.md` — intake remains the same step in the pipeline; only its internal content and link target change.

## Context: what exists today

- `/intake` (classic, `src/app/intake/page.tsx`) — a plain form driven by `getIntakeSections()` in `src/lib/intake-questions.ts`. Boolean/select/multiselect/text/textarea/file question types already exist. Submits to `/api/intake/submit`, which triggers the calendar-ready email + shows a "Book Your Kickoff Call" CTA on success. Unaffected by this change except for the question content itself.
- `/intake/ai` (`src/app/intake/ai/page.tsx`) — three phases: pick "have a website" (prefill via `/api/intake/prefill`, reads the site and pre-fills answers) or "starting fresh" (open-ended chat via `/api/intake/agent`, `"Tell us about your business"`), then a review/edit screen reusing the same section schema, then the same `/api/intake/submit`.
- Two places currently route clients to `/intake/ai`: `sendIntakeEmail` (`src/lib/email.ts`, picks `/intake/ai` whenever `OPENAI_API_KEY` is set) and the admin's "Invite Prospect" form (`tenants/page.tsx`, hardcodes `/intake/ai` unconditionally).
- `getIntakeSections(businessType)` accepts a `businessType` param but every business type currently produces the identical 8 sections — the differentiation was never implemented. Out of scope here; not touched.
- Backend-rc has `plans` → `plan_modules` (a plan's default modules) and `tenant_modules` (the tenant's actual enabled set, including add-ons purchased after the fact) — `tenant_modules` is the real source of truth per tenant, populated at plan assignment (`routes/plans.js` `POST /:planKey/assign/:tenantId`).

## Scope of removal

Delete entirely (no unused-but-present code left behind):
- `src/app/intake/ai/page.tsx`
- `src/app/api/intake/agent/route.ts`
- `src/app/api/intake/prefill/route.ts`
- `src/lib/intake-ai-schema.ts` (AI answer-extraction schema, only consumed by the two routes above)

Change to always resolve to `/intake`:
- `sendIntakeEmail` in `src/lib/email.ts` — remove the `OPENAI_API_KEY` branch, always build `${APP_URL}/intake?token=...`.
- `tenants/page.tsx` "Invite Prospect" submit handler — change the hardcoded `/intake/ai?token=...` to `/intake?token=...`.

Untouched: `/intake/page.tsx` itself (question rendering), `/api/intake/verify`, `/api/intake/submit`, the calendar-ready-email flow, file upload handling.

## Module-awareness mechanism

`createIntakeToken(email, tenantId, businessType, websiteId, tenantName)` gains a `modules: string[]` parameter. Both call sites (the admin "Invite Prospect" flow and any other place that sends an intake email) look up the tenant's current `tenant_modules` once, at token-creation time, and pass the list in. The module list is embedded in the signed token payload alongside the existing fields — it's a snapshot, not a live value.

This requires a new backend-rc endpoint (internal-key-protected, following the existing pattern in `routes/tenantProspects.js`'s `requireInternalKey`) that returns a tenant's enabled `module_key`s given a `tenantId`. `/api/intake/verify` doesn't call backend-rc at all under this design — it decodes the token locally exactly as it does today, now returning `modules` alongside `businessType`.

**Trade-off accepted:** if an admin changes a tenant's modules after the invite is sent but before the client finishes intake, the client sees the old module set. Given intake tokens are single-use and typically completed within days, this is an acceptable staleness window in exchange for the classic form never depending on backend-rc being reachable.

## Schema extensions needed (`intake-questions.ts`)

Two additions to `IntakeQuestion`/`IntakeSection`:
- `requiredModules?: string[]` — the question/section is only shown if the tenant's module list includes at least one of these. Absent means always shown.
- `showIf?: { questionId: string; equals: string | boolean }` — the question is only shown once another question in the same section has a specific answer. This is the boolean-gate-then-reveal pattern used throughout the rework (e.g., a `has_testimonials` boolean gating the testimonials textarea).

`getIntakeSections` gains a `modules: string[]` parameter (alongside the existing, still-unused `businessType`) and filters both sections and individual questions against `requiredModules` before returning them. Client-side rendering additionally hides any question whose `showIf` condition isn't currently met, and excludes hidden questions from the required-field validation in `ReviewPhase`/`intake/page.tsx`'s submit handler.

## Question-by-question treatment

Sections stay in their current order. "Gate" means a boolean/select question is added immediately before the listed field, and the listed field becomes conditional on it via `showIf`.

**About Your Business** (universal, no module gate)
| Question | Change |
|---|---|
| business_name, owner_name, location, service_area | Unchanged |
| years_in_business | text → select: `<1 year` / `1–3 years` / `3–10 years` / `10+ years` |
| credentials | Gate: boolean "Any certifications, licenses, or credentials to highlight?" → conditional textarea |
| ideal_client, differentiator, tagline | Unchanged (open narrative, kept for discovery + copywriting) |
| topics_to_avoid | Gate: boolean "Anything we should avoid mentioning?" → conditional textarea |

**Your Brand** (universal)
| Question | Change |
|---|---|
| asset_drive_link | Unchanged |
| brand_colors | text → multiselect from a curated palette-mood list (Bold & energetic / Earthy & natural / Modern & minimal / Warm & friendly / Corporate & professional / Custom) + conditional text for "Custom" |
| brand_words | text → multiselect from a curated adjective list (~16 options: reliable, modern, friendly, bold, elegant, trustworthy, playful, premium, approachable, innovative, family-owned, luxury, no-nonsense, energetic, calm, cutting-edge) + "Other" conditional text |

**Photos & Media** (universal)
| Question | Change |
|---|---|
| video_links | Gate: boolean "Any video content, testimonials, or promo clips?" → conditional textarea |
| existing_testimonials | Gate: boolean "Do you have testimonials or reviews to feature?" → conditional textarea |

**Services, Products & Booking** (universal core + module-conditional additions)
| Question | Change |
|---|---|
| primary_offerings | Unchanged (core narrative, required) |
| pricing_packages | Gate: boolean "Do you have set pricing or packages to share?" → conditional textarea |
| customer_action | Unchanged multiselect, but option list filtered to enabled modules (e.g. "Buy online" only offered if `checkout_ecommerce`, "Book appointment" only if `calendar_appointments`, "Make reservation" only if `reservations`; Call/Contact form/Visit location always offered) |
| fulfillment_details | Split by module: `checkout_ecommerce` → multiselect (Ship products / Local pickup / Digital delivery / In-person handoff) + conditional textarea; `calendar_appointments`/`reservations` → short textarea "Describe your booking flow"; neither → select (We go to them / They come to us / Both) |
| hours_service_area | Split into two: hours as select (Standard M–F / Extended incl. weekends / 24/7 / Custom) + conditional textarea; service area as select (Within 5/10/25/50+ miles / Statewide or national / Fully virtual) |
| policies_guarantees | text → multiselect (Money-back guarantee / Warranty on work / Free estimates / Satisfaction guarantee / Deposit required / Cancellation policy / None) + conditional "anything else" textarea |

**Online Presence & Platforms** (universal — kept for discovery regardless of purchased modules)
| Question | Change |
|---|---|
| google_business_url, facebook_url, instagram_url, yelp_url | Each gated by its own boolean ("Do you have a Google Business Profile?" etc.) → conditional text for the URL |
| other_review_platforms | Gate: boolean "Any other directories/review profiles (Angi, Thumbtack, BBB, HomeAdvisor, etc.)?" → conditional textarea |
| has_google_ads | Unchanged (already select) |
| existing_booking_software | text → select (Jobber / ServiceTitan / Calendly / Housecall Pro / Square / None / Other) + conditional text for "Other" |

**Automation & Workflows** (universal — kept for discovery call prep regardless of plan)
| Question | Change |
|---|---|
| manual_workflows, automation_notes | Unchanged (open narrative) |
| current_tools | textarea → multiselect (Invoicing software / Scheduling software / CRM / Spreadsheets / Texting from personal phone / Managing social manually / None) + conditional "Other" text |
| automation_interest | Unchanged (already multiselect) |

**Contact & Business Info** (universal)
| Question | Change |
|---|---|
| business_phone, email_preference, has_insurance, content_approval_contact | Unchanged |
| business_address | Gate: select "Do you have a physical storefront/office?" (Yes / No, mobile or service-area only) → conditional text for the address |

**Website Setup & Launch** (universal)
| Question | Change |
|---|---|
| existing_website_url | Gate: boolean "Do you have an existing website?" → conditional text for the URL |
| existing_domain | text → select (I already own a domain / I need to buy one / Not sure yet) → conditional text for the domain name if "already own" |
| domain_registrar | text → select (GoDaddy / Namecheap / Google Domains / Squarespace / Wix / Other / Not sure) + conditional "Other" text; only shown if `existing_domain` = "already own" |
| target_go_live | text → select (ASAP / Within 2 weeks / Within 1 month / Flexible / Specific date) + conditional text for the date if "Specific date" |

## Data flow

```
Admin invites prospect / sends intake email
        |
        v
createIntakeToken(email, tenantId, businessType, websiteId, tenantName, modules)
   - modules fetched once from backend-rc's new internal endpoint
   - embedded in the signed token payload
        |
        v
Client opens /intake?token=... (only entry point — /intake/ai no longer exists)
   -> POST /api/intake/verify decodes token locally, returns
      { email, tenantId, businessType, websiteId, tenantName, modules }
        |
        v
getIntakeSections(businessType, modules) filters sections/questions by
requiredModules; client further hides questions failing their showIf condition
        |
        v
POST /api/intake/submit (unchanged) -> calendar-ready email + kickoff CTA
```

## Error handling

- If the new backend-rc internal endpoint is unreachable at invite-creation time, fail the invite/send action with a clear error rather than silently embedding an empty module list (an empty list would hide every module-gated question, producing a broken-looking form for the client).
- If a token predates this change (embeds no `modules` field), `/api/intake/verify` defaults to an empty array — module-gated questions are hidden, everything else renders normally. No backfill needed since intake tokens expire after 7 days.

## Testing / verification

No automated test suite covers the intake form today. Verification is manual, same as the existing pattern in this repo's specs: exercise `/intake` end-to-end with a real (test) tenant for at least one module combination that includes `checkout_ecommerce` and one that doesn't, confirm module-gated and `showIf`-gated questions show/hide correctly, and confirm `/api/intake/submit`'s required-field validation correctly ignores hidden questions.

## Out of scope

- Implementing real `businessType` differentiation (still an unused parameter after this change).
- Any change to `/api/intake/submit`, the calendar-ready email, or file upload handling.
- A UI for admins to preview what a specific tenant's intake form will look like before sending it.
