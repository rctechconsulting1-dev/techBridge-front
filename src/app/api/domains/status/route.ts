import { NextRequest, NextResponse } from "next/server";
import { fetchFirstSuccessfulCandidate } from "@/lib/proxy-candidates";
import { getApiBaseUrl } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawDomain = Record<string, unknown>;

const getBackendApiBase = () => getApiBaseUrl();

const normalizeStatus = (value: unknown): string => {
  if (typeof value !== "string" || value.trim() === "") {
    return "pending";
  }
  return value.trim().toLowerCase();
};

const normalizeDomainRecord = (raw: RawDomain) => {
  const id =
    typeof raw.id === "number"
      ? raw.id
      : typeof raw.id === "string"
        ? Number(raw.id)
        : null;

  const domain =
    typeof raw.domain === "string"
      ? raw.domain
      : typeof raw.host === "string"
        ? raw.host
        : "";

  return {
    id,
    domain,
    status: normalizeStatus(raw.status),
    isPrimary:
      typeof raw.is_primary === "boolean"
        ? raw.is_primary
        : typeof raw.isPrimary === "boolean"
          ? raw.isPrimary
          : false,
    verificationTarget:
      typeof raw.verification_target === "string"
        ? raw.verification_target
        : typeof raw.verificationTarget === "string"
          ? raw.verificationTarget
          : null,
    verificationType:
      typeof raw.verification_type === "string"
        ? raw.verification_type
        : typeof raw.verificationType === "string"
          ? raw.verificationType
          : null,
    failureReason:
      typeof raw.failure_reason === "string"
        ? raw.failure_reason
        : typeof raw.failureReason === "string"
          ? raw.failureReason
          : null,
    updatedAt:
      typeof raw.updated_at === "string"
        ? raw.updated_at
        : typeof raw.updatedAt === "string"
          ? raw.updatedAt
          : null,
  };
};

const parseDomainList = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload
      .filter((item): item is RawDomain => Boolean(item && typeof item === "object"))
      .map(normalizeDomainRecord);
  }

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const candidates = [obj.domains, obj.items, obj.data];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate
          .filter((item): item is RawDomain => Boolean(item && typeof item === "object"))
          .map(normalizeDomainRecord);
      }
    }
  }

  return [];
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
    `${apiBase}/domains/status?website_id=${encodeURIComponent(websiteId)}`,
    `${apiBase}/domains?website_id=${encodeURIComponent(websiteId)}`,
    `${apiBase}/tenant-domains?website_id=${encodeURIComponent(websiteId)}`,
    `${apiBase}/tenant-domains/status?website_id=${encodeURIComponent(websiteId)}`,
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
    const payload = await result.response.json();
    return NextResponse.json({ domains: parseDomainList(payload) });
  }

  return NextResponse.json(
    {
      available: false,
      error: "No domain status endpoint is available in the backend yet.",
      domains: [],
    },
    { status: 200 },
  );
}
