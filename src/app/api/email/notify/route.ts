import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendNotificationEmail } from "@/lib/email";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  heading: z.string().min(1),
  /** HTML or plain text body content. */
  body: z.string().min(1),
  cta: z
    .object({
      label: z.string().min(1),
      href: z.string().url(),
    })
    .optional(),
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

  const { to, ...payload } = parsed.data;

  const { data, error } = await sendNotificationEmail(to, payload);

  if (error) {
    console.error("[email/notify] Resend error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id }, { status: 200 });
}
