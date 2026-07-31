import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForCalendarTokens,
  fetchCalendarAccountEmail,
} from "@/lib/google-calendar";
import { verifyAdminAuth } from "@/lib/route-auth";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderCalendarConnectHtml(opts: {
  refreshToken?: string | null;
  email?: string | null;
  error?: string;
}): string {
  const { refreshToken, email, error } = opts;

  if (error) {
    return `<!doctype html><html><body style="font-family:sans-serif;padding:40px;">
      <h1>Google Calendar connection failed</h1>
      <p>Error: ${escapeHtml(error)}</p>
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
    <p>Connected account: <strong>${escapeHtml(email ?? "unknown")}</strong></p>
    <p>Copy this refresh token into your deployment environment as
    <code>CALENDAR_GOOGLE_REFRESH_TOKEN</code>, then redeploy:</p>
    <pre style="background:#f3f4f6;padding:16px;border-radius:8px;white-space:pre-wrap;word-break:break-all;">${escapeHtml(refreshToken)}</pre>
    <p><a href="/site-settings">Back to Site Settings</a></p>
  </body></html>`;
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return auth.response;

  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");
  const headers = { "Content-Type": "text/html", "Cache-Control": "no-store" };

  if (oauthError) {
    return new NextResponse(renderCalendarConnectHtml({ error: oauthError }), { headers });
  }
  if (!code) {
    return new NextResponse(renderCalendarConnectHtml({ error: "no_code" }), { headers });
  }

  let tokens: Awaited<ReturnType<typeof exchangeCodeForCalendarTokens>>;
  try {
    tokens = await exchangeCodeForCalendarTokens(code);
  } catch (err) {
    console.error("[calendar-connect/callback] Failed to exchange code:", err);
    return new NextResponse(renderCalendarConnectHtml({ error: "exchange_failed" }), { headers });
  }

  // The email lookup is best-effort only: a failure here must not swallow the
  // refresh token, which Google only issues once (on first consent).
  let email: string | null = null;
  if (tokens.access_token) {
    try {
      email = await fetchCalendarAccountEmail(tokens.access_token);
    } catch (err) {
      console.error("[calendar-connect/callback] Failed to fetch account email:", err);
    }
  }

  return new NextResponse(
    renderCalendarConnectHtml({ refreshToken: tokens.refresh_token, email }),
    { headers },
  );
}
