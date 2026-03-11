import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendVerifyEmail, verifyVerificationToken } from "@/lib/email";

// ─── POST /api/email/verify  →  send verification email ──────────────────────

const sendSchema = z.object({
  to: z.string().email(),
  // Accept both undefined and explicit null from JSON to avoid 400s caused by
  // JSON.stringify serialising JS `null` values sent by client code.
  firstName: z.string().nullish(),
  /** If your auth backend already issued a token, pass it here. */
  token: z.string().nullish(),
  userId: z.string().nullish(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[email/verify] Validation failed, body:", body, "errors:", parsed.error.flatten());
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { to, firstName, token, userId } = parsed.data;

  const { data, error } = await sendVerifyEmail({
    to,
    firstName: firstName ?? undefined,
    token: token ?? undefined,
    userId: userId ?? undefined,
  });

  if (error) {
    console.error("[email/verify] Resend error:", JSON.stringify(error));
    // In Resend sandbox mode (from: onboarding@resend.dev), emails can only be
    // delivered to the Resend account owner's address. Add a verified domain
    // in the Resend dashboard and update RESEND_FROM_EMAIL to fix this in production.
    return NextResponse.json({ error: "Failed to send email", details: error }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id }, { status: 200 });
}

// ─── GET /api/email/verify?token=...  →  confirm the token ───────────────────
// The link in the email points here. On success, redirect to the app.

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/auth/verify-email?error=missing_token`);
  }

  const payload = await verifyVerificationToken(token);

  if (!payload) {
    return NextResponse.redirect(`${APP_URL}/auth/verify-email?error=invalid_or_expired`);
  }

  // Token is valid — redirect to the app with the verified email address
  const email = encodeURIComponent(String(payload.email ?? ""));
  return NextResponse.redirect(
    `${APP_URL}/auth/verify-email?verified=true&email=${email}`,
  );
}
