import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendResetPasswordEmail } from "@/lib/email";

const schema = z.object({
  to: z.string().email(),
  firstName: z.string().optional(),
  /**
   * Externally generated reset token (e.g. from your auth backend).
   * If omitted the email service generates a self-contained HMAC token.
   */
  token: z.string().optional(),
  userId: z.string().optional(),
  tenantId: z.number().int().positive().optional(),
  websiteId: z.number().int().positive().optional(),
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

  const { to, firstName, token, userId, tenantId, websiteId } = parsed.data;

  const { data, error } = await sendResetPasswordEmail({
    to,
    firstName,
    token,
    userId,
    tenantId,
    websiteId,
  });

  if (error) {
    console.error("[email/reset-password] Resend error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id }, { status: 200 });
}
