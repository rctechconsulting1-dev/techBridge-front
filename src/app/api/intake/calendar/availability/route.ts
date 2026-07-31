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
