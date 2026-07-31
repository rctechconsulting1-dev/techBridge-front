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
