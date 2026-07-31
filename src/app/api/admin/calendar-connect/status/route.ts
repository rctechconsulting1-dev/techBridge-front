import { NextRequest, NextResponse } from "next/server";
import { isCalendarConnected } from "@/lib/google-calendar";
import { verifyAdminAuth } from "@/lib/route-auth";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return auth.response;

  return NextResponse.json({ connected: isCalendarConnected() });
}
