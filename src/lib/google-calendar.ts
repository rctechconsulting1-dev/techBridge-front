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
