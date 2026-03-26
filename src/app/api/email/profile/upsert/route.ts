import { NextRequest, NextResponse } from "next/server";
import { fetchFirstSuccessfulCandidate } from "@/lib/proxy-candidates";
import { getApiBaseUrl } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getBackendApiBase = () => getApiBaseUrl();

const normalizeEmailList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    websiteId?: number | string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    sendingDomain?: string;
    emailMode?: string;
    leadNotificationEmails?: string[];
  };

  const websiteId = body.websiteId ? String(body.websiteId) : "";
  if (!websiteId) {
    return NextResponse.json(
      { error: "websiteId is required" },
      { status: 400 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");
  const apiBase = getBackendApiBase();

  const payload = {
    website_id: Number.isNaN(Number(websiteId)) ? websiteId : Number(websiteId),
    websiteId,
    from_name: body.fromName?.trim() || null,
    from_email: body.fromEmail?.trim() || null,
    reply_to: body.replyTo?.trim() || null,
    sending_domain: body.sendingDomain?.trim() || null,
    email_mode: body.emailMode?.trim() || "platform_sender",
    lead_notification_emails: normalizeEmailList(body.leadNotificationEmails),
  };

  const candidates = [
    `${apiBase}/email/profile`,
    `${apiBase}/email/sender-profile`,
    `${apiBase}/tenant-email/profile`,
  ];

  const result = await fetchFirstSuccessfulCandidate({
    candidates,
    makeRequest: (url) =>
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(tenantHeader ? { "x-tenant-id": tenantHeader } : {}),
        },
        body: JSON.stringify(payload),
      }),
    passthroughStatuses: new Set([400, 401, 402, 403, 409, 429]),
  });

  if (result.kind === "passthrough") {
    return result.response;
  }

  if (result.kind === "success") {
    const data = await result.response.json().catch(() => ({}));
    return NextResponse.json(data);
  }

  return NextResponse.json(
    {
      error: "No tenant email profile upsert endpoint is available in the backend yet.",
    },
    { status: 404 },
  );
}
