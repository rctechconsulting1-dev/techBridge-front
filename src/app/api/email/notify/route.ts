import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendNotificationEmail } from "@/lib/email";
import { notifyOpsAlert } from "@/lib/ops-alerts";
import { recordFlowMetric } from "@/lib/opsMetrics";
import { getApiBaseUrl } from "@/lib/api";

const schema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]).optional(),
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
  websiteId: z.union([z.number(), z.string()]).optional(),
  tenantId: z.string().optional(),
});

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

const RETRY_MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.EMAIL_NOTIFY_RETRY_MAX_ATTEMPTS || 3),
);
const RETRY_BASE_MS = Math.max(
  100,
  Number(process.env.EMAIL_NOTIFY_RETRY_BASE_MS || 500),
);
const MAX_DLQ_ITEMS = Math.max(10, Number(process.env.EMAIL_DLQ_MAX_ITEMS || 200));
const BACKEND_API_BASE = getApiBaseUrl();
const OPS_INGEST_KEY = process.env.OPS_METRICS_INGEST_KEY || "";

const normalizeRecipients = (value: string | string[] | undefined): string[] => {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map((item) => item.trim().toLowerCase()).filter(Boolean))];
};

const resolveLeadRecipients = async (websiteId: string | undefined) => {
  if (!websiteId) {
    return {
      tenantId: undefined,
      recipients: [],
      reason: "websiteId is required to resolve tenant lead recipients",
    };
  }

  if (!OPS_INGEST_KEY) {
    return {
      tenantId: undefined,
      recipients: [],
      reason: "OPS_METRICS_INGEST_KEY is not configured",
    };
  }

  const response = await fetch(
    `${BACKEND_API_BASE}/ops/lead-routing?websiteId=${encodeURIComponent(websiteId)}`,
    {
      method: "GET",
      headers: {
        "x-ops-ingest-key": OPS_INGEST_KEY,
      },
      cache: "no-store",
    },
  );

  const data = (await response.json().catch(() => ({}))) as {
    tenantId?: string | number;
    recipients?: string[];
    error?: string;
  };

  if (!response.ok) {
    return {
      tenantId: data.tenantId ? String(data.tenantId) : undefined,
      recipients: [],
      reason: data.error || `Lead routing lookup failed (${response.status})`,
    };
  }

  return {
    tenantId: data.tenantId ? String(data.tenantId) : undefined,
    recipients: normalizeRecipients(data.recipients),
    reason: undefined,
  };
};

const getDlqStore = (): DeadLetterRecord[] => {
  const globalWithStore = globalThis as typeof globalThis & {
    __emailNotifyDlq?: DeadLetterRecord[];
  };

  if (!globalWithStore.__emailNotifyDlq) {
    globalWithStore.__emailNotifyDlq = [];
  }

  return globalWithStore.__emailNotifyDlq;
};

const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

type EmailSendSuccess = {
  ok: true;
  data: Awaited<ReturnType<typeof sendNotificationEmail>>["data"];
  attempts: number;
};

type EmailSendFailure = {
  ok: false;
  attempts: number;
  error: string;
};

type EmailSendResult = EmailSendSuccess | EmailSendFailure;

type DeliveryResult = {
  recipient: string;
  result: EmailSendResult;
};

const isDeliverySuccess = (
  item: DeliveryResult,
): item is DeliveryResult & { result: EmailSendSuccess } => item.result.ok;

const isDeliveryFailure = (
  item: DeliveryResult,
): item is DeliveryResult & { result: EmailSendFailure } => !item.result.ok;

const sanitizeErrorMessage = (value: unknown): string => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (value instanceof Error && value.message.trim()) {
    return value.message.trim();
  }
  return "unknown-email-delivery-error";
};

const enqueueDeadLetter = (record: DeadLetterRecord) => {
  const dlq = getDlqStore();
  dlq.unshift(record);

  if (dlq.length > MAX_DLQ_ITEMS) {
    dlq.length = MAX_DLQ_ITEMS;
  }
};

const persistDeadLetter = async (record: DeadLetterRecord): Promise<void> => {
  if (!OPS_INGEST_KEY) {
    return;
  }

  try {
    await fetch(`${BACKEND_API_BASE}/email-dlq/enqueue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ops-ingest-key": OPS_INGEST_KEY,
      },
      body: JSON.stringify({
        id: record.id,
        websiteId: record.websiteId,
        tenantId: record.tenantId,
        to: record.to,
        subject: record.subject,
        heading: record.heading,
        body: record.payload.body,
        cta: record.payload.cta,
        attempts: record.attempts,
        error: record.error,
        createdAt: record.createdAt,
      }),
      cache: "no-store",
    });
  } catch {
    // Keep request success path independent from DLQ persistence network failures.
  }
};

const trySendWithRetry = async (
  to: string,
  payload: {
    subject: string;
    heading: string;
    body: string;
    cta?: {
      label: string;
      href: string;
    };
  },
  context: {
    websiteId?: string;
    tenantId?: string;
  },
): Promise<EmailSendResult> => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt += 1) {
    try {
      const { data, error } = await sendNotificationEmail(to, payload, context);

      if (!error) {
        return { ok: true, data, attempts: attempt };
      }

      lastError = error;
    } catch (error) {
      lastError = error;
    }

    if (attempt < RETRY_MAX_ATTEMPTS) {
      const backoffMs = RETRY_BASE_MS * 2 ** (attempt - 1);
      await sleep(backoffMs);
    }
  }

  return {
    ok: false,
    attempts: RETRY_MAX_ATTEMPTS,
    error: sanitizeErrorMessage(lastError),
  };
};

const buildDeadLetterRecord = (
  to: string,
  payload: {
    subject: string;
    heading: string;
    body: string;
    cta?: {
      label: string;
      href: string;
    };
  },
  websiteId: string | undefined,
  tenantId: string | undefined,
  attempts: number,
  error: string,
): DeadLetterRecord => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  createdAt: new Date().toISOString(),
  websiteId,
  tenantId,
  to,
  subject: payload.subject,
  heading: payload.heading,
  attempts,
  error,
  payload: {
    body: payload.body,
    cta: payload.cta,
  },
});

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    recordFlowMetric({
      flow: "email_notify",
      success: false,
      durationMs: Date.now() - startedAt,
      code: "INVALID_JSON",
    });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    recordFlowMetric({
      flow: "email_notify",
      success: false,
      durationMs: Date.now() - startedAt,
      code: "INVALID_PAYLOAD",
    });
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { to, websiteId, tenantId, ...payload } = parsed.data;
  const websiteIdText =
    typeof websiteId === "undefined" ? undefined : String(websiteId);
  const explicitRecipients = normalizeRecipients(to);
  const resolvedLeadRouting = explicitRecipients.length
    ? { tenantId: tenantId ?? undefined, recipients: explicitRecipients, reason: undefined }
    : await resolveLeadRecipients(websiteIdText);
  const recipients = resolvedLeadRouting.recipients;
  const effectiveTenantId = tenantId || resolvedLeadRouting.tenantId;

  if (recipients.length === 0) {
    recordFlowMetric({
      flow: "email_notify",
      success: true,
      durationMs: Date.now() - startedAt,
      websiteId: websiteIdText,
      tenantId: effectiveTenantId,
      code: "EMAIL_NOTIFY_SKIPPED_NO_RECIPIENTS",
    });

    return NextResponse.json(
      {
        skipped: true,
        code: "EMAIL_NOTIFY_SKIPPED_NO_RECIPIENTS",
        reason:
          resolvedLeadRouting.reason ||
          "No tenant lead recipients are configured for this website.",
      },
      { status: 202 },
    );
  }

  const deliveryResults: DeliveryResult[] = await Promise.all(
    recipients.map(async (recipient) => ({
      recipient,
      result: await trySendWithRetry(recipient, payload, {
        websiteId: websiteIdText,
        tenantId: effectiveTenantId,
      }),
    })),
  );
  const successes = deliveryResults.filter(isDeliverySuccess);
  const failures = deliveryResults.filter(isDeliveryFailure);

  if (failures.length === 0) {
    recordFlowMetric({
      flow: "email_notify",
      success: true,
      durationMs: Date.now() - startedAt,
      websiteId: websiteIdText,
      tenantId: effectiveTenantId,
    });

    return NextResponse.json(
      {
        ids: successes.map((item) => item.result.data?.id).filter(Boolean),
        attempts: Math.max(...successes.map((item) => item.result.attempts)),
        recipients,
      },
      { status: 200 },
    );
  }

  const dlqRecords = failures.map(({ recipient, result }) =>
    buildDeadLetterRecord(
      recipient,
      payload,
      websiteIdText,
      effectiveTenantId,
      result.attempts,
      result.error,
    ),
  );
  for (const dlqRecord of dlqRecords) {
    enqueueDeadLetter(dlqRecord);
    await persistDeadLetter(dlqRecord);
  }

  console.error("[email/notify] delivery failed after retries", {
    recipients: failures.map((item) => item.recipient),
    subject: payload.subject,
    attempts: failures.map((item) => item.result.attempts),
    errors: failures.map((item) => item.result.error),
    dlqIds: dlqRecords.map((item) => item.id),
  });

  await notifyOpsAlert(
    {
      source: "email_notify",
      message: "Notification email moved to dead-letter queue",
      severity: "error",
      details: {
        failedRecipients: failures.map((item) => item.recipient),
        deliveredRecipients: successes.map((item) => item.recipient),
        subject: payload.subject,
        attempts: failures.map((item) => item.result.attempts),
        errors: failures.map((item) => item.result.error),
        dlqIds: dlqRecords.map((item) => item.id),
        websiteId: websiteIdText,
        tenantId: effectiveTenantId,
      },
    },
    {
      dedupeKey: `email_notify:dlq:${websiteIdText || "no-website"}:${payload.subject}`,
    },
  );

  recordFlowMetric({
    flow: "email_notify",
    success: successes.length > 0,
    durationMs: Date.now() - startedAt,
    websiteId: websiteIdText,
    tenantId: effectiveTenantId,
    code:
      successes.length > 0
        ? "EMAIL_NOTIFY_PARTIAL_DLQ_ENQUEUED"
        : "EMAIL_NOTIFY_DLQ_ENQUEUED",
  });

  return NextResponse.json(
    {
      error:
        successes.length > 0
          ? "Some notification emails failed and were moved to the dead-letter queue"
          : "Failed to send email after retries; moved to dead-letter queue",
      code:
        successes.length > 0
          ? "EMAIL_NOTIFY_PARTIAL_DLQ_ENQUEUED"
          : "EMAIL_NOTIFY_DLQ_ENQUEUED",
      dlqIds: dlqRecords.map((item) => item.id),
      recipients: {
        delivered: successes.map((item) => item.recipient),
        failed: failures.map((item) => item.recipient),
      },
    },
    { status: successes.length > 0 ? 207 : 503 },
  );
}
