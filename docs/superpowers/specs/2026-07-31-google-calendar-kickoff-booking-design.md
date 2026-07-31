# Google Calendar Kickoff-Call Booking (Replacing Calendly)

Date: 2026-07-31
Status: Draft, pending implementation planning
Repos affected: `admin-dashboard-rc` only. No changes to the separate backend service.

## Purpose

Today, once a prospect completes the intake questionnaire, they're pointed at a static Calendly link (`CALENDAR_BOOKING_URL`) to self-schedule the kickoff call. Replace this with a self-hosted booking flow against a Google Calendar the business owner connects once: the prospect picks a real open slot inline on the Thank You screen, and the app creates a Google Calendar event with a Google Meet link directly via the Calendar API.

Google's own Calendly-equivalent ("Appointment Schedule" booking pages) requires a paid Google Workspace account; the business only has a free Gmail account, so that path is unavailable. This design instead has the app query free/busy and create events itself, authenticated as a single connected Google account via OAuth (not a Workspace/service-account setup).

## Context: what exists today

- `src/lib/email.ts` `sendCalendarReadyEmail()` — sends a "Book Your Kickoff Call" email whose CTA links to `process.env.CALENDAR_BOOKING_URL` (a Calendly URL). Throws if that env var isn't set.
- `src/app/api/intake/submit/route.ts` — on first-time intake completion (`completeBody.firstCompletion`), if `CALENDAR_BOOKING_URL` is set, calls `sendCalendarReadyEmail` and returns `calendarUrl` in the JSON response.
- `src/app/intake/page.tsx` — the Thank You screen shows a "Book Your Kickoff Call" button linking to `calendarUrl` (opens in a new tab) when present.
- `verifyIntakeToken` (`src/lib/email.ts`) — verifies the signed intake token used across `/api/intake/verify`, `/api/intake/submit`, and file uploads. Not single-use; safe to re-verify later (needed for the "book later" deep link).
- Existing Google OAuth (`src/lib/google-oauth.ts`, `src/app/api/auth/google/*`) is specific to Google Business Profile: per-tenant, scoped to `business.manage`, and forwards tokens to a separate backend service (`agency-google-token` endpoint) for storage. That backend repo is not available in this workflow. This design does **not** reuse or extend that flow — it builds a separate, self-contained OAuth path for a single, agency-wide calendar connection, since there's exactly one calendar to connect (not one per tenant).
- `site-settings/page.tsx` already has a "Stripe Connect" card pattern (connect button + refresh-status button + status line) used as the visual/structural model for the new "Kickoff Call Calendar" card.

## Scope of removal

- `CALENDAR_BOOKING_URL` env var — no longer read anywhere.
- The `calendarUrl` field in the `/api/intake/submit` JSON response.
- The static "Book Your Kickoff Call" `<a>` CTA in `intake/page.tsx`'s Thank You branch.

## New env vars

- `GOOGLE_CALENDAR_REDIRECT_URI` — e.g. `${APP_URL}/api/admin/calendar-connect/callback`.
- `CALENDAR_GOOGLE_REFRESH_TOKEN` — captured once via the connect flow below, pasted in manually (same manual-config pattern `CALENDAR_BOOKING_URL` used).
- `KICKOFF_CALENDAR_ID` — defaults to `"primary"` if unset.

Reused: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (the existing registered OAuth app; a new scope is added to the consent request, no new Google Cloud project needed).

## One-time admin connect flow

New file `src/lib/google-calendar.ts`:
- Its own `google.auth.OAuth2` client, scope `https://www.googleapis.com/auth/calendar`.
- `generateCalendarAuthUrl()`.
- `exchangeCodeForCalendarTokens(code)`.
- `getFreeBusy(startISO, endISO)` — wraps `calendar.freebusy.query` against `KICKOFF_CALENDAR_ID`.
- `createKickoffMeetingEvent({ start, end, attendeeEmail, tenantName })` — wraps `calendar.events.insert` with `conferenceDataVersion: 1`, a `hangoutsMeet` conference request, `attendees: [{ email: attendeeEmail }]`, `sendUpdates: "all"`.

New routes:
- `GET /api/admin/calendar-connect` — returns `{ authUrl }` from `generateCalendarAuthUrl()`.
- `GET /api/admin/calendar-connect/callback` — exchanges the code, fetches the connected account's email, and renders a plain confirmation page showing the refresh token and email once, with instructions to set `CALENDAR_GOOGLE_REFRESH_TOKEN` (and redeploy). Not persisted to any database — this is a manual, one-time copy-paste step, same trust model as the existing `CALENDAR_BOOKING_URL` manual config.
- `GET /api/admin/calendar-connect/status` — returns `{ connected: boolean }` based on whether `CALENDAR_GOOGLE_REFRESH_TOKEN` is set.

`site-settings/page.tsx` gets a new "Kickoff Call Calendar" card: a "Connect Google Calendar" button (redirects to the URL from `/api/admin/calendar-connect`) and a status line driven by `/api/admin/calendar-connect/status`, visually matching the existing Stripe Connect card.

## Availability rules

30-minute slots, computed in `America/Los_Angeles`:
- Mon-Fri: 2:00pm-7:00pm
- Sat-Sun: 9:00am-11:00am

Slots are generated for the next 14 days from "today" at request time.

## Availability + booking APIs

- `GET /api/intake/calendar/availability?token=...` — verifies the intake token via `verifyIntakeToken`. Generates the candidate slots per the rules above, issues one `getFreeBusy` call across the full 14-day range, filters out any slot overlapping a busy block, and returns the remaining slots grouped by date (each slot as an ISO start time; end is implied as start + 30min).
- `POST /api/intake/calendar/book` — body `{ token, start }`. Verifies the token, re-runs `getFreeBusy` for just that slot's window to guard against a race with another booking, then calls `createKickoffMeetingEvent` with the prospect's email (from the token payload) and tenant name. Returns `{ start, end, meetLink }`.

No separate confirmation email is sent by this app for a successful booking — `sendUpdates: "all"` makes Google send its own calendar invite (with the Meet link, add-to-calendar, and reminders) directly to the attendee, which covers this need without a duplicate.

## Frontend

- New `src/components/intake/BookingPicker.tsx` — given a `token`, fetches availability, renders slots grouped by date (Pacific-labeled), posts the chosen slot to the booking endpoint, and shows a confirmation state (chosen time + a "Join with Google Meet" link using the returned `meetLink`).
- `src/app/intake/page.tsx` Thank You branch — the static CTA is replaced with `<BookingPicker token={token} />`, shown inline immediately after submission.
- New `src/app/intake/book/page.tsx` — verifies the token via the same `useIntakeToken` pattern and renders `BookingPicker` directly (no questionnaire), for prospects returning later via the reminder email.

## "Book later" reminder email

- `sendCalendarReadyEmail` (`src/lib/email.ts`) keeps its name and trigger (first-time intake completion) but its CTA now points to `${APP_URL}/intake/book?token=...` instead of `calendarUrl`, and it no longer throws if an env var is missing — it has no external dependency to check.
- `src/app/api/intake/submit/route.ts` — the guard `if (completeBody.firstCompletion && process.env.CALENDAR_BOOKING_URL)` becomes `if (completeBody.firstCompletion)`. The response no longer includes `calendarUrl`.

## Error handling

- If `CALENDAR_GOOGLE_REFRESH_TOKEN` isn't set, `/api/intake/calendar/availability` returns a 503 with a message the `BookingPicker` renders as "Booking isn't available right now — we'll reach out to schedule your kickoff call directly," so a prospect is never blocked from finishing intake by a missing calendar connection.
- If booking a slot fails the re-check (someone else took it in the meantime), `/api/intake/calendar/book` returns 409; `BookingPicker` refetches availability and asks the prospect to pick another slot.

## Testing

- Unit tests for slot generation (correct Pacific-time windows, correct weekday/weekend rules, DST-crossing days handled correctly by relying on `Intl`/`Temporal`-safe date math rather than fixed UTC offsets).
- Unit tests for filtering candidate slots against a mocked `freebusy.query` response.
- Route-level tests for `/api/intake/calendar/availability` and `/api/intake/calendar/book` (token verification failure, missing refresh token, double-booking race).
