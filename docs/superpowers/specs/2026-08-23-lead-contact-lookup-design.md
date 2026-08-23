# Lead Contact Lookup (Investigate button)

Date: 2026-08-23
Status: Draft, pending implementation planning
Repos affected: `admin-dashboard-rc` only (new API route, new frontend button). No changes to `backend-rc` — the existing `PATCH /outreach-leads/:id` endpoint already does everything needed to persist the result.

## Purpose

Many leads land in `needs_email_lookup` with no email and no website — Google Maps captures the "has a website" signal but never the actual URL, and CSLB/Craigslist/Facebook/Instagram text rarely has either. Today the only way to fill those in is a human manually searching for the business and pasting the result into the lead's email field. This adds an "Investigate" action that does that lookup automatically: find the business's real website via Google Places, then check that site's homepage (and, if needed, its contact page) for a visible email address.

This does not replace the manual "paste an email you found yourself" flow already in `LeadActionsModal.tsx` — it's a faster first attempt that falls back to that same manual flow when it can't find something.

## Context: what exists today

- `backend-rc/routes/outreachLeads.js`'s `PATCH /:id` already: accepts `email`/`websiteUrl` in the body, auto-transitions `status` from `needs_email_lookup` to `ready_to_send` when an email is newly set (unless the caller also explicitly set `status`), and re-runs the existing-tenant/prospect cross-check on any new email, forcing `do_not_contact` if it matches. This design sends its results through that same endpoint rather than adding new backend logic.
- `src/app/api/leads/parse/route.ts` is the existing pattern for an admin-only Next.js API route that calls an external AI/data service: verify the Bearer token against the backend's `/auth/me` (never trust a client-decoded JWT), require `admin`/`platform_admin` role, rate-limit via `checkRateLimit`. This design's new route follows the same shape.
- No Google Places (or any Places/Maps Platform) integration exists in either repo today. `routes/google.js` in `backend-rc` is a different Google API (Business Profile OAuth, tenant-scoped) and is unrelated.
- No test runner exists in either repo — verification is `tsc --noEmit` plus manual exercise, same as every other recent change in this area.
- SMS/text sending was considered and explicitly deferred (see this feature's design conversation) due to TCPA exposure on cold outreach; out of scope here.

## Flow

New route: `src/app/api/leads/investigate/route.ts` (`POST`).

Request body: `{ leadId: string, businessName: string, city?: string, hasEmail: boolean, hasWebsite: boolean }`. `hasEmail`/`hasWebsite` come from the lead object the frontend already has loaded — the route uses them to decide what it's allowed to fill in, so it never overwrites a value a human already entered.

1. **Auth** — same as `leads/parse`: require `Authorization` header, verify via backend `/auth/me`, require admin role.
2. **Rate limit** — reuse `checkRateLimit` (same helper `leads/parse` uses), separate namespace (`leads-investigate`) so tuning one never affects the other.
3. **Find the place** — Google Places Text Search (`https://maps.googleapis.com/maps/api/place/textsearch/json`) with `query = "${businessName} ${city ?? ""}"`. Take the top result's `place_id`. No result → respond with a "no matching business found" outcome, nothing further attempted.
4. **Get the website** — Places Details for that `place_id`, `fields=website` only (minimizes cost — this call is billed per field mask). No website → stop here with a partial outcome.
5. **Look for an email** (only if `hasEmail` is false and a website was found):
   - Fetch the homepage: 5s timeout, abort if response body exceeds ~500KB, only follow `http`/`https`, resolve the hostname first and reject if it points at a loopback/private/link-local address (SSRF guard — this is the first place either repo fetches an arbitrary third-party URL from external, less-trusted data).
   - Scan the HTML for `mailto:` links first (most reliable signal); if none, fall back to a plain email regex over the visible text.
   - If nothing found, and there's an anchor whose text matches `/contact/i` pointing at a same-origin path, fetch that one page with the same safety limits and repeat the scan. Stop after this either way (max 2 fetches).
6. **Persist** — `PATCH` the lead via the backend (server-to-server, forwarding the caller's Bearer token) with whatever was found: `websiteUrl` if `hasWebsite` was false and a website was found; `email` if `hasEmail` was false and one was found. If neither was found, no PATCH is made.
7. **Respond** to the frontend with a small result summary: `{ foundWebsite: boolean, foundEmail: boolean, websiteUrl?: string, email?: string }` so the UI can show the right message and doesn't need to re-fetch the lead itself (the caller already calls `onUpdated()` afterward, which does refetch the canonical row).

## Frontend

`LeadActionsModal.tsx`: an "Investigate" button next to the existing manual email-entry UI, shown whenever `!lead.email || !lead.website_url`, disabled while a request is in flight. On completion, shows one of:
- "Found website and email — saved." (both found)
- "Found website, no email visible on the site." (website only)
- "No matching business found." (place search came up empty)

Then calls `onUpdated()` (the same refresh callback every other action in this modal already uses) so the modal and list both reflect the new `website_url`/`email`/`status`.

## Safety / cost

- `GOOGLE_PLACES_API_KEY` — new env var, server-side only (never sent to the client).
- Places Text Search + Details are both billed per call; the per-lead manual trigger (rather than automatic-on-capture or bulk) keeps this bounded to leads an operator actually chose to chase, and the rate limiter caps abuse from rapid repeat clicks.
- The homepage/contact-page fetch is the one new category of risk: fetching a URL that ultimately came from Google's index rather than user input, but still third-party and untrusted. The timeout, size cap, and private-IP rejection in step 5 are all required, not optional hardening.

## Error handling

- Places API failure (bad key, quota, network) → 502 with a message the UI can show, no partial writes.
- Website fetch failure (timeout, non-2xx, connection refused) → treated the same as "no email found," not a hard error — the website was still real and worth saving even if the site itself is temporarily unreachable.
- Backend PATCH failure → surfaced as an error to the user; nothing silently lost since the Places/email results are only in this request's memory, not persisted elsewhere.

## Testing

No test runner in either repo (see Context). Manual verification:
1. A lead with a real, findable business name + city → confirms the website+email path and the resulting `status` transition to `ready_to_send`.
2. A lead with a nonsense/unmatchable business name → confirms the graceful "no matching business found" path with no PATCH sent.
3. A lead whose real business has a website but no visible contact email on it → confirms the partial-fill path (website saved, email left blank, status stays `needs_email_lookup`).
4. A lead that already has a `website_url` but no email → confirms the route only attempts the email lookup and does not touch the existing website.

## Out of scope

- Automated/bulk triggering (every lead in `needs_email_lookup`, or auto-run on capture) — deferred; can be added later as a bulk button or `provider_job` if per-lead usage shows this is worth scaling up.
- SMS/text sending — deferred separately due to TCPA risk on cold outreach; not part of this design.
- Deeper site crawling beyond the homepage + one contact-like page — kept to 2 fetches max to bound latency and cost.
