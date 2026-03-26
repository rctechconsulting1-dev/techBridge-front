import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  resolveNotificationSenderForContext,
  sendNotificationEmail,
} from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  websiteId: z.union([z.number().int().positive(), z.string().min(1)]),
  tenantId: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
  to: z.string().email(),
});

const getBackendApiBase = () =>
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

const extractErrorMessage = (value: unknown): string => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (value instanceof Error && value.message.trim()) {
    return value.message.trim();
  }

  if (value && typeof value === "object") {
    const maybeMessage = (value as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage.trim();
    }
  }

  return "Unable to send test email.";
};

const persistTestResult = async ({
  req,
  websiteId,
  to,
  sender,
  status,
  error,
}: {
  req: NextRequest;
  websiteId: string;
  to: string;
  sender: string | null;
  status: "success" | "failed";
  error?: string;
}) => {
  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");

  await fetch(`${getBackendApiBase()}/email/profile/test-result`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(tenantHeader ? { "x-tenant-id": tenantHeader } : {}),
    },
    body: JSON.stringify({
      websiteId,
      to,
      sender,
      status,
      error: error || null,
    }),
    cache: "no-store",
  }).catch(() => undefined);
};

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "websiteId and a valid recipient email are required." },
      { status: 400 },
    );
  }

  const websiteId = String(parsed.data.websiteId);
  const tenantId = parsed.data.tenantId ? String(parsed.data.tenantId) : undefined;
  const recipient = parsed.data.to.trim().toLowerCase();
  const sender = await resolveNotificationSenderForContext({ websiteId, tenantId });

  try {
    const { error } = await sendNotificationEmail(
      recipient,
      {
        subject: "RC TechBridge launch verification test",
        heading: "Launch verification test",
        body: [
          "This is a manual test email sent from Global Site Settings.",
          "Use it to confirm the actual sender identity, reply-to behavior, and delivery path before final launch.",
        ].join(" "),
      },
      { websiteId, tenantId },
    );

    if (error) {
      const message = extractErrorMessage(error);
      await persistTestResult({
        req,
        websiteId,
        to: recipient,
        sender: sender.from,
        status: "failed",
        error: message,
      });
      return NextResponse.json({ error: message }, { status: 502 });
    }

    await persistTestResult({
      req,
      websiteId,
      to: recipient,
      sender: sender.from,
      status: "success",
    });

    return NextResponse.json({
      ok: true,
      sender: sender.from,
      replyTo: sender.replyTo ?? null,
      message: "Test email sent and recorded.",
    });
  } catch (error) {
    const message = extractErrorMessage(error);
    await persistTestResult({
      req,
      websiteId,
      to: recipient,
      sender: sender.from,
      status: "failed",
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}