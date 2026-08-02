# Google Calendar Kickoff-Call Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static Calendly link on the intake Thank You screen with a self-hosted booking flow: prospects pick a real open slot, and the app creates a Google Calendar event (with a Google Meet link) directly via the Calendar API, using a single Google account connected once by the business owner.

**Architecture:** Everything lives in `admin-dashboard-rc` — no changes to the separate backend service. One Google account is connected via OAuth (its own consent flow, distinct from the existing Google Business Profile OAuth); its refresh token is stored as an env var (`CALENDAR_GOOGLE_REFRESH_TOKEN`), the same manual-config pattern `CALENDAR_BOOKING_URL` used. All Calendar API calls (`googleapis`) happen server-side in Next.js API routes.

**Tech Stack:** Next.js App Router API routes, `googleapis` (already a dependency), `zod` (already a dependency), the existing HMAC-signed intake token (`verifyIntakeToken` in `src/lib/email.ts`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-31-google-calendar-kickoff-booking-design.md` — every task below implements a piece of it.
- No changes to the separate backend service (`getApiBaseUrl()` target) — this feature is fully self-contained in `admin-dashboard-rc`.
- Reuse `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (already set). New env vars: `GOOGLE_CALENDAR_REDIRECT_URI`, `CALENDAR_GOOGLE_REFRESH_TOKEN`, `KICKOFF_CALENDAR_ID` (defaults to `"primary"` if unset).
- `CALENDAR_BOOKING_URL` is removed — no code should read it after this plan is complete.
- Availability window: 30-minute slots, `America/Los_Angeles` timezone. Mon-Fri 2:00pm-7:00pm, Sat-Sun 9:00am-11:00am. Next 14 calendar days from "now", excluding any slot that starts in the past.
- No new npm dependencies — `googleapis` and `zod` are already installed.
- This repo has no unit-test framework (no jest/vitest, no test script in `package.json`). Verification is `npx tsc --noEmit` for type safety plus manual curl/browser checks against the running dev server (`npm run dev`), matching the existing `scripts/*-smoke-test.mjs` convention (see `scripts/nav-assignment-smoke-test.mjs` for the pattern of minting your own signed token with `node:crypto`).
- Follow existing code style: no comments except where a non-obvious constraint needs explaining, Tailwind classes matching neighboring components, `NextResponse.json` error shapes matching sibling routes (`{ error: string }`).

---

### Task 1: Core Google Calendar library (slot math + OAuth/API wrappers)

**Files:**
- Create: `src/lib/google-calendar.ts`

**Interfaces:**
- Produces: `CalendarSlot { start: string; end: string }` (ISO 8601 UTC instants), `generateCandidateSlots(now: Date, days: number): CalendarSlot[]`, `filterAvailableSlots(candidates: CalendarSlot[], busy: { start: string; end: string }[]): CalendarSlot[]`, `generateCalendarAuthUrl(): string`, `exchangeCodeForCalendarTokens(code: string): Promise<{ refresh_token?: string | null; access_token?: string | null }>`, `fetchCalendarAccountEmail(accessToken: string): Promise<string | null>`, `isCalendarConnected(): boolean`, `getFreeBusy(startISO: string, endISO: string): Promise<{ start: string; end: string }[]>`, `createKickoffMeetingEvent(opts: { start: string; end: string; attendeeEmail: string; tenantName?: string }): Promise<{ eventId: string; meetLink: string | null }>`.
- Consumes: nothing from other tasks (this is the foundation).

- [ ] **Step 1: Write the file**

```ts
import { google } from "googleapis";

const TIMEZONE = "America/Los_Angeles";
const SLOT_MINUTES = 30;
const WEEKDAY_HOURS = { startHour: 14, endHour: 19 };
const WEEKEND_HOURS = { startHour: 9, endHour: 11 };
const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"];

export interface CalendarSlot {
  start: string;
  end: string;
}

function getZonedYMD(date: Date): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Converts a wall-clock time in `TIMEZONE` to a UTC Date, handling DST correctly. */
function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(utcGuess).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const driftMs = asIfUtc - utcGuess.getTime();
  return new Date(utcGuess.getTime() - driftMs);
}

/**
 * 30-minute candidate slots for the next `days` calendar days (Pacific time):
 * Mon-Fri 2pm-7pm, Sat-Sun 9am-11am. Excludes any slot starting at or before `now`.
 */
export function generateCandidateSlots(now: Date, days: number): CalendarSlot[] {
  const slots: CalendarSlot[] = [];
  const today = getZonedYMD(now);

  for (let offset = 0; offset < days; offset++) {
    const { year, month, day } = addDays(today.year, today.month, today.day, offset);
    const weekday = weekdayOf(year, month, day);
    const isWeekend = weekday === 0 || weekday === 6;
    const { startHour, endHour } = isWeekend ? WEEKEND_HOURS : WEEKDAY_HOURS;

    for (
      let minutes = startHour * 60;
      minutes + SLOT_MINUTES <= endHour * 60;
      minutes += SLOT_MINUTES
    ) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const start = zonedTimeToUtc(year, month, day, hour, minute);
      if (start.getTime() <= now.getTime()) continue;
      const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000);
      slots.push({ start: start.toISOString(), end: end.toISOString() });
    }
  }

  return slots;
}

export function filterAvailableSlots(
  candidates: CalendarSlot[],
  busy: { start: string; end: string }[],
): CalendarSlot[] {
  return candidates.filter((slot) => {
    const slotStart = new Date(slot.start).getTime();
    const slotEnd = new Date(slot.end).getTime();
    return !busy.some((b) => {
      const busyStart = new Date(b.start).getTime();
      const busyEnd = new Date(b.end).getTime();
      return busyStart < slotEnd && busyEnd > slotStart;
    });
  });
}

function getCalendarOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  );
}

export function generateCalendarAuthUrl(): string {
  return getCalendarOAuthClient().generateAuthUrl({
    access_type: "offline",
    scope: CALENDAR_SCOPES,
    prompt: "consent",
  });
}

export async function exchangeCodeForCalendarTokens(code: string) {
  const { tokens } = await getCalendarOAuthClient().getToken(code);
  return tokens;
}

export async function fetchCalendarAccountEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.email ?? null;
  } catch {
    return null;
  }
}

export function isCalendarConnected(): boolean {
  return Boolean(process.env.CALENDAR_GOOGLE_REFRESH_TOKEN);
}

function getCalendarId(): string {
  return process.env.KICKOFF_CALENDAR_ID || "primary";
}

function getAuthorizedCalendarClient() {
  const refreshToken = process.env.CALENDAR_GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) return null;
  const client = getCalendarOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: client });
}

export async function getFreeBusy(
  startISO: string,
  endISO: string,
): Promise<{ start: string; end: string }[]> {
  const calendar = getAuthorizedCalendarClient();
  if (!calendar) throw new Error("Calendar is not connected");

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: startISO,
      timeMax: endISO,
      items: [{ id: getCalendarId() }],
    },
  });

  const busy = res.data.calendars?.[getCalendarId()]?.busy ?? [];
  return busy
    .filter((b): b is { start: string; end: string } => Boolean(b.start && b.end))
    .map((b) => ({ start: b.start, end: b.end }));
}

export interface CreateKickoffMeetingOptions {
  start: string;
  end: string;
  attendeeEmail: string;
  tenantName?: string;
}

export interface CreateKickoffMeetingResult {
  eventId: string;
  meetLink: string | null;
}

export async function createKickoffMeetingEvent({
  start,
  end,
  attendeeEmail,
  tenantName,
}: CreateKickoffMeetingOptions): Promise<CreateKickoffMeetingResult> {
  const calendar = getAuthorizedCalendarClient();
  if (!calendar) throw new Error("Calendar is not connected");

  const res = await calendar.events.insert({
    calendarId: getCalendarId(),
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: `Kickoff Call — ${tenantName?.trim() || "New Client"}`,
      start: { dateTime: start },
      end: { dateTime: end },
      attendees: [{ email: attendeeEmail }],
      conferenceData: {
        createRequest: {
          requestId: `kickoff-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return {
    eventId: res.data.id ?? "",
    meetLink: res.data.hangoutLink ?? null,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors referencing `src/lib/google-calendar.ts`.

- [ ] **Step 3: Note on verifying the slot math**

This repo has no TS runner (no `tsx`/`ts-node`) to execute `generateCandidateSlots` in isolation, so it isn't unit-tested standalone here. It's exercised end-to-end (including DST behavior across a summer/PDT and winter/PST date) once Task 3 wires it into the availability API route — that task's manual verification step checks slot times against expected Pacific-time windows.

- [ ] **Step 4: Commit**

```bash
git add src/lib/google-calendar.ts
git commit -m "feat: add Google Calendar slot math and API wrapper"
```

---

### Task 2: Admin connect flow (routes + Site Settings card)

**Files:**
- Create: `src/app/api/admin/calendar-connect/route.ts`
- Create: `src/app/api/admin/calendar-connect/callback/route.ts`
- Create: `src/app/api/admin/calendar-connect/status/route.ts`
- Modify: `src/app/(admin)/(others-pages)/site-settings/page.tsx`

**Interfaces:**
- Consumes: `generateCalendarAuthUrl`, `exchangeCodeForCalendarTokens`, `fetchCalendarAccountEmail`, `isCalendarConnected` from `src/lib/google-calendar.ts` (Task 1).
- Produces: `GET /api/admin/calendar-connect` → `{ authUrl: string }`; `GET /api/admin/calendar-connect/callback` → HTML page; `GET /api/admin/calendar-connect/status` → `{ connected: boolean }`.

- [ ] **Step 1: Connect route**

```ts
// src/app/api/admin/calendar-connect/route.ts
import { NextResponse } from "next/server";
import { generateCalendarAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  return NextResponse.json({ authUrl: generateCalendarAuthUrl() });
}
```

- [ ] **Step 2: Status route**

```ts
// src/app/api/admin/calendar-connect/status/route.ts
import { NextResponse } from "next/server";
import { isCalendarConnected } from "@/lib/google-calendar";

export async function GET() {
  return NextResponse.json({ connected: isCalendarConnected() });
}
```

- [ ] **Step 3: Callback route**

```ts
// src/app/api/admin/calendar-connect/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForCalendarTokens,
  fetchCalendarAccountEmail,
} from "@/lib/google-calendar";

function renderCalendarConnectHtml(opts: {
  refreshToken?: string | null;
  email?: string | null;
  error?: string;
}): string {
  const { refreshToken, email, error } = opts;

  if (error) {
    return `<!doctype html><html><body style="font-family:sans-serif;padding:40px;">
      <h1>Google Calendar connection failed</h1>
      <p>Error: ${error}</p>
      <p><a href="/site-settings">Back to Site Settings</a></p>
    </body></html>`;
  }

  if (!refreshToken) {
    return `<!doctype html><html><body style="font-family:sans-serif;padding:40px;max-width:640px;">
      <h1>No refresh token returned</h1>
      <p>Google only returns a refresh token on first consent. Revoke this app's access at
      <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>
      and connect again.</p>
    </body></html>`;
  }

  return `<!doctype html><html><body style="font-family:sans-serif;padding:40px;max-width:640px;">
    <h1>Google Calendar connected</h1>
    <p>Connected account: <strong>${email ?? "unknown"}</strong></p>
    <p>Copy this refresh token into your deployment environment as
    <code>CALENDAR_GOOGLE_REFRESH_TOKEN</code>, then redeploy:</p>
    <pre style="background:#f3f4f6;padding:16px;border-radius:8px;white-space:pre-wrap;word-break:break-all;">${refreshToken}</pre>
    <p><a href="/site-settings">Back to Site Settings</a></p>
  </body></html>`;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");
  const headers = { "Content-Type": "text/html" };

  if (oauthError) {
    return new NextResponse(renderCalendarConnectHtml({ error: oauthError }), { headers });
  }
  if (!code) {
    return new NextResponse(renderCalendarConnectHtml({ error: "no_code" }), { headers });
  }

  try {
    const tokens = await exchangeCodeForCalendarTokens(code);
    const email = tokens.access_token
      ? await fetchCalendarAccountEmail(tokens.access_token)
      : null;
    return new NextResponse(
      renderCalendarConnectHtml({ refreshToken: tokens.refresh_token, email }),
      { headers },
    );
  } catch (err) {
    console.error("[calendar-connect/callback] Failed to exchange code:", err);
    return new NextResponse(renderCalendarConnectHtml({ error: "exchange_failed" }), { headers });
  }
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors in the three new route files.

- [ ] **Step 5: Add env vars locally**

Add to `.env` (values are placeholders until Step 7's real connect flow):

```
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/admin/calendar-connect/callback
CALENDAR_GOOGLE_REFRESH_TOKEN=
KICKOFF_CALENDAR_ID=primary
```

- [ ] **Step 6: Register the redirect URI in Google Cloud Console**

In the Google Cloud project that owns `GOOGLE_CLIENT_ID` (console.cloud.google.com → APIs & Services → Credentials → this OAuth client), add `http://localhost:3000/api/admin/calendar-connect/callback` to "Authorized redirect URIs" (and the production URL once deployed). Enable the "Google Calendar API" for the project if it isn't already (APIs & Services → Library).

- [ ] **Step 7: Add the Site Settings card**

In `src/app/(admin)/(others-pages)/site-settings/page.tsx`, find the `stripeConnectStatus` state declarations (search for `useState<StripeConnectStatus`) and add nearby:

```ts
const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
const [calendarConnectStarting, setCalendarConnectStarting] = useState(false);
```

Add a standalone effect (not inside the tenant-scoped `[wid]` effect block) near the other top-level `useEffect` calls:

```ts
useEffect(() => {
  fetch("/api/admin/calendar-connect/status")
    .then((r) => r.json())
    .then((d) => setCalendarConnected(Boolean(d.connected)))
    .catch(() => setCalendarConnected(false));
}, []);

const startCalendarConnect = useCallback(async () => {
  setCalendarConnectStarting(true);
  try {
    const res = await fetch("/api/admin/calendar-connect");
    const data = (await res.json()) as { authUrl?: string };
    if (data.authUrl) window.location.href = data.authUrl;
  } finally {
    setCalendarConnectStarting(false);
  }
}, []);
```

Then, right after the first `{tab === "settings" && ( ... )}` block that renders "Launch-One Focus" (it ends just before the `{tab === "settings" && selectedLaunchMode === "temporary_launch" && (...)}` block), add a new sibling block:

```tsx
{tab === "settings" && (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold tracking-wide text-[#CD7F32] uppercase">
          Kickoff Call Calendar
        </p>
        <p className="mt-1 text-sm text-gray-500">
          One shared Google Calendar used for every tenant&apos;s kickoff call
          booking — not specific to the tenant selected above.
        </p>
      </div>
      <button
        type="button"
        onClick={startCalendarConnect}
        disabled={calendarConnectStarting}
        className="rounded-lg bg-[#CD7F32] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {calendarConnectStarting
          ? "Redirecting…"
          : calendarConnected
            ? "Reconnect Google Calendar"
            : "Connect Google Calendar"}
      </button>
    </div>
    <p className="mt-3 text-sm">
      Status:{" "}
      <span className="font-medium text-gray-700 dark:text-gray-200">
        {calendarConnected === null
          ? "Checking…"
          : calendarConnected
            ? "Connected"
            : "Not connected"}
      </span>
    </p>
  </div>
)}
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors in `site-settings/page.tsx`.

- [ ] **Step 9: Manual verification**

Run `npm run dev`, sign in as an admin, open Site Settings, confirm the "Kickoff Call Calendar" card shows "Not connected". Click "Connect Google Calendar", complete the Google OAuth consent screen with your Gmail account, and confirm the callback page shows "Google Calendar connected" with a refresh token and your email. Paste that token into `.env` as `CALENDAR_GOOGLE_REFRESH_TOKEN`, restart `npm run dev`, reload Site Settings, and confirm the card now shows "Connected".

- [ ] **Step 10: Commit**

```bash
git add src/app/api/admin/calendar-connect "src/app/(admin)/(others-pages)/site-settings/page.tsx"
git commit -m "feat: add Google Calendar connect flow and Site Settings card"
```

---

### Task 3: Availability API route

**Files:**
- Create: `src/app/api/intake/calendar/availability/route.ts`
- Create: `scripts/mint-intake-token.mjs`

**Interfaces:**
- Consumes: `verifyIntakeToken` (`src/lib/email.ts`, existing); `generateCandidateSlots`, `filterAvailableSlots`, `getFreeBusy`, `isCalendarConnected` (`src/lib/google-calendar.ts`, Task 1).
- Produces: `GET /api/intake/calendar/availability?token=...` → `200 { slots: CalendarSlot[] }`, `400` (missing token), `401` (invalid token), `503 { error: "not_connected" }`.

- [ ] **Step 1: Write the route**

```ts
// src/app/api/intake/calendar/availability/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIntakeToken } from "@/lib/email";
import {
  generateCandidateSlots,
  filterAvailableSlots,
  getFreeBusy,
  isCalendarConnected,
} from "@/lib/google-calendar";

const WINDOW_DAYS = 14;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const payload = await verifyIntakeToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired intake link. Please request a new one." },
      { status: 401 },
    );
  }

  if (!isCalendarConnected()) {
    return NextResponse.json({ error: "not_connected" }, { status: 503 });
  }

  const candidates = generateCandidateSlots(new Date(), WINDOW_DAYS);
  if (candidates.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  const busy = await getFreeBusy(candidates[0].start, candidates[candidates.length - 1].end);
  const slots = filterAvailableSlots(candidates, busy);

  return NextResponse.json({ slots });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors in the new route.

- [ ] **Step 3: Write a token-minting helper for manual testing**

```js
// scripts/mint-intake-token.mjs
import { createHmac } from "node:crypto";

const secret = process.env.EMAIL_INTAKE_SECRET || "change-me-in-production-intake";
const [email, tenantIdArg] = process.argv.slice(2);
const tenantId = Number(tenantIdArg);

if (!email || !Number.isFinite(tenantId)) {
  console.log("Usage: node scripts/mint-intake-token.mjs <email> <tenantId>");
  process.exit(1);
}

const payload = Buffer.from(
  JSON.stringify({
    email,
    tenantId,
    businessType: "universal",
    exp: Math.floor(Date.now() / 1000) + 3600,
  }),
).toString("base64url");

const sig = createHmac("sha256", secret).update(payload).digest("base64url");
console.log(`${payload}.${sig}`);
```

- [ ] **Step 4: Manual verification against the running dev server**

Run `npm run dev`, then in another terminal:

```bash
TOKEN=$(node scripts/mint-intake-token.mjs test@example.com 1)
curl "http://localhost:3000/api/intake/calendar/availability?token=$TOKEN"
```

Expected: a JSON body like `{"slots":[{"start":"2026-08-03T21:00:00.000Z","end":"2026-08-03T21:30:00.000Z"}, ...]}` (adjust the date to whatever "today + N" resolves to when you run it). Confirm:
- Every slot's `start`, converted to Pacific time, falls within 2:00pm-7:00pm on weekdays or 9:00am-11:00am on weekends (spot-check a couple with `TZ=America/Los_Angeles date -d <ISO>` or by pasting into a timezone converter).
- No slot overlaps an event already on the connected Google Calendar (create a test event during a weekday afternoon slot on the connected calendar first, rerun the curl, and confirm that slot is missing from the response).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/intake/calendar/availability scripts/mint-intake-token.mjs
git commit -m "feat: add intake calendar availability endpoint"
```

---

### Task 4: Booking API route

**Files:**
- Create: `src/app/api/intake/calendar/book/route.ts`

**Interfaces:**
- Consumes: `verifyIntakeToken` (`src/lib/email.ts`); `filterAvailableSlots`, `getFreeBusy`, `createKickoffMeetingEvent`, `isCalendarConnected` (`src/lib/google-calendar.ts`, Task 1).
- Produces: `POST /api/intake/calendar/book` body `{ token: string; start: string; end: string }` → `200 { start: string; end: string; meetLink: string | null }`, `400`, `401`, `409 { error: "slot_taken" }`, `503 { error: "not_connected" }`, `500`.

- [ ] **Step 1: Write the route**

```ts
// src/app/api/intake/calendar/book/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyIntakeToken } from "@/lib/email";
import {
  filterAvailableSlots,
  getFreeBusy,
  createKickoffMeetingEvent,
  isCalendarConnected,
} from "@/lib/google-calendar";

const schema = z.object({
  token: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { token, start, end } = parsed.data;

  const payload = await verifyIntakeToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired intake link. Please request a new one." },
      { status: 401 },
    );
  }

  if (!isCalendarConnected()) {
    return NextResponse.json({ error: "not_connected" }, { status: 503 });
  }

  const { email, tenantName } = payload as unknown as {
    email: string;
    tenantName?: string;
  };

  const busy = await getFreeBusy(start, end);
  const stillFree = filterAvailableSlots([{ start, end }], busy);
  if (stillFree.length === 0) {
    return NextResponse.json({ error: "slot_taken" }, { status: 409 });
  }

  try {
    const { meetLink } = await createKickoffMeetingEvent({
      start,
      end,
      attendeeEmail: email,
      tenantName,
    });
    return NextResponse.json({ start, end, meetLink });
  } catch (err) {
    console.error("[intake/calendar/book] Failed to create event:", err);
    return NextResponse.json(
      { error: "Failed to book the meeting. Please try again." },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors in the new route.

- [ ] **Step 3: Manual verification**

With `npm run dev` running and a valid slot from Task 3's availability response:

```bash
TOKEN=$(node scripts/mint-intake-token.mjs test@example.com 1)
curl -X POST http://localhost:3000/api/intake/calendar/book \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"start\":\"2026-08-03T21:00:00.000Z\",\"end\":\"2026-08-03T21:30:00.000Z\"}"
```

(substitute a real slot start/end from the availability response). Expected: `200` with `{"start":"...","end":"...","meetLink":"https://meet.google.com/..."}`. Then confirm in Google Calendar (the connected account) that an event titled "Kickoff Call — New Client" now exists at that time with a Google Meet link attached, and that `test@example.com` is listed as an attendee. Re-run the same curl command a second time and confirm it now returns `409 {"error":"slot_taken"}`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/intake/calendar/book
git commit -m "feat: add intake calendar booking endpoint"
```

---

### Task 5: BookingPicker component

**Files:**
- Create: `src/components/intake/BookingPicker.tsx`

**Interfaces:**
- Consumes: `GET /api/intake/calendar/availability?token=...` and `POST /api/intake/calendar/book` (Tasks 3 and 4).
- Produces: `BookingPicker({ token: string })` React component, used by Task 6.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";

interface CalendarSlot {
  start: string;
  end: string;
}

interface BookingPickerProps {
  token: string;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  weekday: "short",
  month: "short",
  day: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  hour: "numeric",
  minute: "2-digit",
});

function groupSlotsByDate(slots: CalendarSlot[]): { date: string; slots: CalendarSlot[] }[] {
  const groups = new Map<string, CalendarSlot[]>();
  for (const slot of slots) {
    const key = DATE_FORMAT.format(new Date(slot.start));
    const existing = groups.get(key) ?? [];
    existing.push(slot);
    groups.set(key, existing);
  }
  return Array.from(groups.entries()).map(([date, dateSlots]) => ({ date, slots: dateSlots }));
}

export function BookingPicker({ token }: BookingPickerProps) {
  const [slots, setSlots] = useState<CalendarSlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ start: string; meetLink: string | null } | null>(
    null,
  );

  useEffect(() => {
    fetch(`/api/intake/calendar/availability?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.status === 503) {
          setError(
            "Booking isn't available right now — we'll reach out to schedule your kickoff call directly.",
          );
          setSlots([]);
          return;
        }
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { slots: CalendarSlot[] };
        setSlots(data.slots);
      })
      .catch(() => {
        setError("Failed to load available times.");
        setSlots([]);
      });
  }, [token]);

  const grouped = useMemo(() => (slots ? groupSlotsByDate(slots) : []), [slots]);

  const handleBook = async (slot: CalendarSlot) => {
    setBooking(slot.start);
    setError(null);

    try {
      const res = await fetch("/api/intake/calendar/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, start: slot.start, end: slot.end }),
      });

      if (res.status === 409) {
        setError("That time was just taken — pick another slot below.");
        const refreshed = await fetch(
          `/api/intake/calendar/availability?token=${encodeURIComponent(token)}`,
        );
        if (refreshed.ok) {
          const data = (await refreshed.json()) as { slots: CalendarSlot[] };
          setSlots(data.slots);
        }
        return;
      }

      if (!res.ok) throw new Error("failed");

      const data = (await res.json()) as { start: string; meetLink: string | null };
      setConfirmed(data);
    } catch {
      setError("Failed to book the meeting. Please try again.");
    } finally {
      setBooking(null);
    }
  };

  if (confirmed) {
    return (
      <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          You&apos;re booked for {DATE_FORMAT.format(new Date(confirmed.start))} at{" "}
          {TIME_FORMAT.format(new Date(confirmed.start))} Pacific.
        </p>
        {confirmed.meetLink && (
          <a
            href={confirmed.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#CD7F32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#B8721D]"
          >
            Join with Google Meet
          </a>
        )}
      </div>
    );
  }

  if (slots === null) {
    return (
      <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading available times…</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {error ?? "No open times in the next two weeks — we'll reach out to schedule directly."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        You&apos;re ready to book your kickoff call. Pick a time (Pacific):
      </p>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.date}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {group.date}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.slots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  disabled={booking !== null}
                  onClick={() => handleBook(slot)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-[#CD7F32] hover:text-[#CD7F32] disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                >
                  {TIME_FORMAT.format(new Date(slot.start))}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors in the new component.

- [ ] **Step 3: Commit**

```bash
git add src/components/intake/BookingPicker.tsx
git commit -m "feat: add BookingPicker component"
```

---

### Task 6: Wire BookingPicker into the intake flow

**Files:**
- Modify: `src/app/intake/page.tsx`
- Create: `src/app/intake/book/page.tsx`

**Interfaces:**
- Consumes: `BookingPicker` (Task 5), `POST /api/intake/verify` (existing).

- [ ] **Step 1: Remove the old `calendarUrl` state and CTA in `intake/page.tsx`**

Remove this line (around line 390):

```ts
const [calendarUrl, setCalendarUrl] = useState<string | undefined>(undefined);
```

Remove this line from the submit handler (around line 468):

```ts
setCalendarUrl(body.calendarUrl as string | undefined);
```

Replace the CTA block in the Success state (around lines 534-548):

```tsx
{calendarUrl && (
  <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
    <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
      You&apos;re ready to book your kickoff call.
    </p>
    <a
      href={calendarUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg bg-[#CD7F32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#B8721D] focus:outline-none focus:ring-2 focus:ring-[#CD7F32] focus:ring-offset-2 dark:focus:ring-offset-gray-950"
    >
      Book Your Kickoff Call
    </a>
  </div>
)}
```

with:

```tsx
{token && <BookingPicker token={token} />}
```

Add the import near the top of the file, alongside the existing `@/lib/intake-questions` import:

```ts
import { BookingPicker } from "@/components/intake/BookingPicker";
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors in `intake/page.tsx` (confirms `calendarUrl` is fully removed and `BookingPicker` resolves).

- [ ] **Step 3: Create the "book later" page**

```tsx
// src/app/intake/book/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BookingPicker } from "@/components/intake/BookingPicker";

function BookPageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    fetch("/api/intake/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => setStatus(res.ok ? "valid" : "invalid"))
      .catch(() => setStatus("invalid"));
  }, [token]);

  if (status === "loading") {
    return <p className="p-8 text-sm text-gray-500 dark:text-gray-400">Loading…</p>;
  }

  if (status === "invalid" || !token) {
    return (
      <p className="p-8 text-sm text-gray-500 dark:text-gray-400">
        Invalid or expired link. Please request a new one.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
        Book Your Kickoff Call
      </h1>
      <BookingPicker token={token} />
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-500 dark:text-gray-400">Loading…</p>}>
      <BookPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors in the new page.

- [ ] **Step 5: Manual browser verification**

Run `npm run dev`. Using a real (or freshly minted, via `scripts/mint-intake-token.mjs`) intake link, submit `/intake?token=...` through to completion and confirm the Thank You screen shows the slot picker inline, grouped by date, in Pacific time. Book a slot and confirm the confirmation state shows the chosen time and a working "Join with Google Meet" link. Separately, visit `/intake/book?token=...` directly with the same token and confirm it renders the picker without the questionnaire.

- [ ] **Step 6: Commit**

```bash
git add src/app/intake/page.tsx src/app/intake/book/page.tsx
git commit -m "feat: replace Calendly CTA with inline Google Calendar booking picker"
```

---

### Task 7: Reminder email + submit route cleanup

**Files:**
- Modify: `src/lib/email.ts`
- Modify: `src/app/api/intake/submit/route.ts`
- Modify: `.env`

**Interfaces:**
- Consumes: `getAppBaseUrl` (existing, `src/lib/api.ts`).
- Produces: updated `SendCalendarReadyEmailOptions` (adds a required `token: string` field); `sendCalendarReadyEmail` no longer throws on a missing env var.

- [ ] **Step 1: Update `sendCalendarReadyEmail` in `src/lib/email.ts`**

Replace the existing `SendCalendarReadyEmailOptions` interface and `sendCalendarReadyEmail` function (around lines 364-394):

```ts
export interface SendCalendarReadyEmailOptions {
  to: string;
  firstName?: string;
  tenantName?: string;
  token: string;
}

export async function sendCalendarReadyEmail({
  to,
  firstName,
  tenantName,
  token,
}: SendCalendarReadyEmailOptions) {
  const bookingUrl = `${APP_URL}/intake/book?token=${encodeURIComponent(token)}`;
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";
  const tenantLabel = tenantName?.trim() ? tenantName.trim() : "your business";

  return getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    subject: "You're ready to book your kickoff call",
    html: buildNotificationHtml({
      subject: "You're ready to book your kickoff call",
      heading: "Thanks for completing your questionnaire!",
      body: `<p>${greeting}</p><p>We've received your answers for <strong>${tenantLabel}</strong>. The next step is to book your kickoff call so we can walk through next steps together.</p>`,
      cta: { label: "Book Your Kickoff Call", href: bookingUrl },
    }),
  });
}
```

- [ ] **Step 2: Update `src/app/api/intake/submit/route.ts`**

Replace the block that currently reads (around lines 158-203):

```ts
  let calendarUrl: string | undefined;
  try {
    const internalKey = process.env.INTERNAL_API_KEY;
    const completeResponse = await fetch(
      `${getApiBaseUrl()}/tenant-prospects/${tenantId}/intake-complete`,
      {
        method: "POST",
        headers: internalKey ? { "x-internal-key": internalKey } : {},
      },
    );

    if (completeResponse.ok) {
      const completeBody = (await completeResponse.json()) as {
        firstCompletion: boolean;
      };

      if (completeBody.firstCompletion && process.env.CALENDAR_BOOKING_URL) {
        calendarUrl = process.env.CALENDAR_BOOKING_URL;
        try {
          await sendCalendarReadyEmail({ to: email, tenantName: undefined });
        } catch (calendarEmailError) {
          console.error(
            "[intake/submit] Failed to send calendar-ready email:",
            calendarEmailError,
          );
        }
      }
    } else {
      console.error(
        "[intake/submit] intake-complete call failed:",
        completeResponse.status,
      );
    }
  } catch (error) {
    console.error("[intake/submit] Failed to mark intake complete:", error);
  }

  return NextResponse.json({
    success: true,
    message: assetIndexWarning
      ? "Thank you! Your questionnaire has been submitted successfully. Uploaded files may take a little longer to appear in admin."
      : "Thank you! Your questionnaire has been submitted successfully.",
    tenantId,
    calendarUrl,
    ...(assetIndexWarning ? { warning: assetIndexWarning } : {}),
  });
}
```

with:

```ts
  try {
    const internalKey = process.env.INTERNAL_API_KEY;
    const completeResponse = await fetch(
      `${getApiBaseUrl()}/tenant-prospects/${tenantId}/intake-complete`,
      {
        method: "POST",
        headers: internalKey ? { "x-internal-key": internalKey } : {},
      },
    );

    if (completeResponse.ok) {
      const completeBody = (await completeResponse.json()) as {
        firstCompletion: boolean;
      };

      if (completeBody.firstCompletion) {
        try {
          await sendCalendarReadyEmail({ to: email, tenantName: undefined, token });
        } catch (calendarEmailError) {
          console.error(
            "[intake/submit] Failed to send calendar-ready email:",
            calendarEmailError,
          );
        }
      }
    } else {
      console.error(
        "[intake/submit] intake-complete call failed:",
        completeResponse.status,
      );
    }
  } catch (error) {
    console.error("[intake/submit] Failed to mark intake complete:", error);
  }

  return NextResponse.json({
    success: true,
    message: assetIndexWarning
      ? "Thank you! Your questionnaire has been submitted successfully. Uploaded files may take a little longer to appear in admin."
      : "Thank you! Your questionnaire has been submitted successfully.",
    tenantId,
    ...(assetIndexWarning ? { warning: assetIndexWarning } : {}),
  });
}
```

- [ ] **Step 3: Remove `CALENDAR_BOOKING_URL` from `.env`**

Delete the `CALENDAR_BOOKING_URL=...` line from `.env` (it was `https://calendly.com/rc-techbridge/kickoff-test`). Confirm nothing else references it:

Run: `grep -rn "CALENDAR_BOOKING_URL" src`
Expected: no output.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors — confirms every `sendCalendarReadyEmail` call site now passes `token`.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, complete a fresh intake submission for a tenant whose `intake_completed_at` is currently null (first completion), and confirm: (a) the Thank You page shows the inline picker as before, (b) an email arrives at that tenant's contact address with subject "You're ready to book your kickoff call" whose "Book Your Kickoff Call" button points to `http://localhost:3000/intake/book?token=...`, and clicking it lands on a working picker.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email.ts src/app/api/intake/submit/route.ts .env
git commit -m "feat: point kickoff-call reminder email at internal booking page"
```
