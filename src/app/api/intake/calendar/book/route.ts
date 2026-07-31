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
