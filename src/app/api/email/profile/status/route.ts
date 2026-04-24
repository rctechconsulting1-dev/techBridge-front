import { NextRequest, NextResponse } from "next/server";
import { fetchFirstSuccessfulCandidate } from "@/lib/proxy-candidates";
import { getApiBaseUrl } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawEmailProfile = Record<string, unknown>;

const getBackendApiBase = () => getApiBaseUrl();

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value : null;

const asBoolean = (value: unknown): boolean => value === true;

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeEmailProfile = (raw: RawEmailProfile) => ({
  available:
    typeof raw.available === "boolean"
      ? raw.available
      : true,
  fromName: asString(raw.from_name) ?? asString(raw.fromName) ?? "",
  fromEmail: asString(raw.from_email) ?? asString(raw.fromEmail) ?? "",
  replyTo: asString(raw.reply_to) ?? asString(raw.replyTo) ?? "",
  sendingDomain:
    asString(raw.sending_domain) ?? asString(raw.sendingDomain) ?? "",
  emailMode:
    asString(raw.email_mode) ?? asString(raw.emailMode) ?? "platform_sender",
  dkimVerified: asBoolean(raw.dkim_verified ?? raw.dkimVerified),
  spfVerified: asBoolean(raw.spf_verified ?? raw.spfVerified),
  leadNotificationEmails: toStringArray(
    raw.lead_notification_emails ?? raw.leadNotificationEmails,
  ),
  verificationNotes:
    asString(raw.verification_notes) ?? asString(raw.verificationNotes),
  verificationLastCheckedAt:
    asString(raw.verification_last_checked_at) ??
    asString(raw.verificationLastCheckedAt),
  lastTestEmailStatus:
    asString(raw.last_test_email_status) ?? asString(raw.lastTestEmailStatus),
  lastTestEmailTo:
    asString(raw.last_test_email_to) ?? asString(raw.lastTestEmailTo),
  lastTestEmailSender:
    asString(raw.last_test_email_sender) ?? asString(raw.lastTestEmailSender),
  lastTestEmailError:
    asString(raw.last_test_email_error) ?? asString(raw.lastTestEmailError),
  lastTestEmailAt:
    asString(raw.last_test_email_at) ?? asString(raw.lastTestEmailAt),
  updatedAt: asString(raw.updated_at) ?? asString(raw.updatedAt),
});

const parsePayload = (payload: unknown) => {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;

    if (obj.profile && typeof obj.profile === "object") {
      return normalizeEmailProfile(obj.profile as RawEmailProfile);
    }

    return normalizeEmailProfile(obj);
  }

  return normalizeEmailProfile({});
};

export async function GET(req: NextRequest) {
  const websiteId = req.nextUrl.searchParams.get("websiteId");
  if (!websiteId) {
    return NextResponse.json({ error: "websiteId is required" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  const tenantHeader = req.headers.get("x-tenant-id");
  const apiBase = getBackendApiBase();

  const candidates = [
    `${apiBase}/email/profile?website_id=${encodeURIComponent(websiteId)}`,
    `${apiBase}/email/sender-profile?website_id=${encodeURIComponent(websiteId)}`,
    `${apiBase}/tenant-email/profile?website_id=${encodeURIComponent(websiteId)}`,
  ];

  const result = await fetchFirstSuccessfulCandidate({
    candidates,
    makeRequest: (url) =>
      fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(tenantHeader ? { "x-tenant-id": tenantHeader } : {}),
        },
      }),
    passthroughStatuses: new Set([400, 401, 402, 403, 409, 429]),
  });

  if (result.kind === "passthrough") {
    return result.response;
  }

  if (result.kind === "success") {
    const payload = await result.response.json().catch(() => ({}));
    return NextResponse.json({ profile: parsePayload(payload) });
  }

  return NextResponse.json(
    {
      error: "No tenant email profile endpoint is available in the backend yet.",
      profile: {
        ...parsePayload({}),
        available: false,
      },
    },
    { status: 200 },
  );
}
