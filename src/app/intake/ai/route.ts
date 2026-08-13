import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // Preserve query string (e.g., ?token=...)
    url.pathname = "/intake";
    return NextResponse.redirect(url.toString());
  } catch (err) {
    // Fallback: redirect to /intake root
    return NextResponse.redirect('/intake');
  }
}
