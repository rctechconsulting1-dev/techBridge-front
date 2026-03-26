import { NextRequest, NextResponse } from "next/server";
import { sendNotificationEmail } from "@/lib/email";
import { recordFlowMetric } from "@/lib/opsMetrics";

type DeadLetterRecord = {
  id: string;
  createdAt: string;
  websiteId?: string;
  tenantId?: string;
  to: string;
  subject: string;
  heading: string;
  attempts: number;
  error: string;
  payload: {
    body: string;
    cta?: {
      label: string;
      href: string;
    };
  };
};

const DLQ_ADMIN_KEY = process.env.EMAIL_DLQ_ADMIN_KEY || "";
const BACKEND_API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const OPS_INGEST_KEY = process.env.OPS_METRICS_INGEST_KEY || "";

const getDlqStore = (): DeadLetterRecord[] => {
  const globalWithStore = globalThis as typeof globalThis & {
    __emailNotifyDlq?: DeadLetterRecord[];
  };

  if (!globalWithStore.__emailNotifyDlq) {
    globalWithStore.__emailNotifyDlq = [];
  }

  return globalWithStore.__emailNotifyDlq;
};

const isAuthorized = (req: NextRequest): boolean => {
  if (!DLQ_ADMIN_KEY) {
    return false;
  }

  return req.headers.get("x-email-dlq-admin-key") === DLQ_ADMIN_KEY;
};

const fetchPersistedDlqItems = async (limit: number): Promise<DeadLetterRecord[] | null> => {
  if (!OPS_INGEST_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `${BACKEND_API_BASE}/email-dlq/items?limit=${encodeURIComponent(String(limit))}`,
      {
        method: "GET",
        headers: {
          "x-ops-ingest-key": OPS_INGEST_KEY,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      items?: Array<{
        id: string;
        createdAt: string;
        websiteId?: string | null;
        tenantId?: string | null;
        to: string;
        subject: string;
        heading: string;
        attempts: number;
        error: string;
        payload?: {
          body: string;
          cta?: {
            label: string;
            href: string;
          };
        };
      }>;
    };

    if (!Array.isArray(payload.items)) {
      return [];
    }

    return payload.items.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      websiteId: item.websiteId || undefined,
      tenantId: item.tenantId || undefined,
      to: item.to,
      subject: item.subject,
      heading: item.heading,
      attempts: item.attempts,
      error: item.error,
      payload: {
        body: item.payload?.body || "",
        cta: item.payload?.cta,
      },
    }));
  } catch {
    return null;
  }
};

const ackPersistedDlqSuccess = async (id: string): Promise<boolean> => {
  if (!OPS_INGEST_KEY) {
    return false;
  }

  try {
    const response = await fetch(`${BACKEND_API_BASE}/email-dlq/ack-success`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ops-ingest-key": OPS_INGEST_KEY,
      },
      body: JSON.stringify({ id }),
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
};

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = Math.max(1, Math.min(Number(req.nextUrl.searchParams.get("limit") || 50), 200));
  const persisted = await fetchPersistedDlqItems(limit);
  const dlq = persisted ?? getDlqStore().slice(0, limit);

  return NextResponse.json(
    {
      count: dlq.length,
      items: dlq.slice(0, limit).map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        websiteId: item.websiteId ?? null,
        tenantId: item.tenantId ?? null,
        to: item.to,
        subject: item.subject,
        heading: item.heading,
        attempts: item.attempts,
        error: item.error,
      })),
    },
    { status: 200 },
  );
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  if (!isAuthorized(req)) {
    recordFlowMetric({
      flow: "email_dlq_replay",
      success: false,
      durationMs: Date.now() - startedAt,
      code: "FORBIDDEN",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    recordFlowMetric({
      flow: "email_dlq_replay",
      success: false,
      durationMs: Date.now() - startedAt,
      code: "MISSING_ID",
    });
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const persisted = await fetchPersistedDlqItems(200);
  const localDlq = getDlqStore();

  const persistedItem = persisted?.find((item) => item.id === body.id);
  const localIndex = localDlq.findIndex((item) => item.id === body.id);

  const item = persistedItem || (localIndex >= 0 ? localDlq[localIndex] : null);
  if (!item) {
    recordFlowMetric({
      flow: "email_dlq_replay",
      success: false,
      durationMs: Date.now() - startedAt,
      code: "NOT_FOUND",
    });
    return NextResponse.json({ error: "DLQ item not found" }, { status: 404 });
  }

  const { data, error } = await sendNotificationEmail(item.to, {
    subject: item.subject,
    heading: item.heading,
    body: item.payload.body,
    cta: item.payload.cta,
  }, {
    websiteId: item.websiteId,
    tenantId: item.tenantId,
  });

  if (error) {
    recordFlowMetric({
      flow: "email_dlq_replay",
      success: false,
      durationMs: Date.now() - startedAt,
      websiteId: item.websiteId,
      tenantId: item.tenantId,
      code: "REPLAY_FAILED",
    });
    return NextResponse.json(
      { error: "Replay failed", details: error },
      { status: 502 },
    );
  }

  if (localIndex >= 0) {
    localDlq.splice(localIndex, 1);
  }
  if (persistedItem) {
    await ackPersistedDlqSuccess(item.id);
  }

  recordFlowMetric({
    flow: "email_dlq_replay",
    success: true,
    durationMs: Date.now() - startedAt,
    websiteId: item.websiteId,
    tenantId: item.tenantId,
  });
  return NextResponse.json(
    {
      replayed: true,
      id: item.id,
      providerId: data?.id,
      remaining: localDlq.length,
    },
    { status: 200 },
  );
}
