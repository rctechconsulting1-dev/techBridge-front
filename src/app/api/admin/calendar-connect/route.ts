import { NextResponse } from "next/server";
import { generateCalendarAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  return NextResponse.json({ authUrl: generateCalendarAuthUrl() });
}
