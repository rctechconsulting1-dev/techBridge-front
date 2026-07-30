import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createIntakeToken } from "@/lib/email";

const schema = z.object({
  tenantId: z.number(),
  // Required, not optional: /api/intake/submit destructures `email` straight
  // off the verified token payload and uses it both for the persisted intake
  // submission record and for a real Resend send (sendCalendarReadyEmail).
  // Passing an empty string here would silently break that email send once
  // the prospect completes their questionnaire, so the real owner email must
  // be embedded in the token, exactly like the existing sendIntakeEmail flow
  // (src/lib/email.ts) already does for the full Create Tenant path.
  ownerEmail: z.string().email(),
  businessType: z.string().optional(),
  tenantName: z.string().optional(),
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

  // NOTE: this route has no admin-session check of its own. It is only
  // reachable from the authenticated Tenants admin page today; if it is
  // ever called from elsewhere, add an admin-session check here first.
  const token = await createIntakeToken(
    parsed.data.ownerEmail,
    parsed.data.tenantId,
    parsed.data.businessType ?? "universal",
    undefined,
    parsed.data.tenantName,
  );

  return NextResponse.json({ token });
}
