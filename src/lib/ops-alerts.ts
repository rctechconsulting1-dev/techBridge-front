type AlertPayload = {
  source: string;
  message: string;
  severity?: "info" | "warning" | "error";
  details?: Record<string, unknown>;
};

import { recordReliabilityEvent } from "@/lib/opsMetrics";

const ALERT_THROTTLE_MS = Number(process.env.OPS_ALERT_THROTTLE_MS || 300000);

const getAlertStore = (): Map<string, number> => {
  const globalWithStore = globalThis as typeof globalThis & {
    __opsAlertThrottle?: Map<string, number>;
  };

  if (!globalWithStore.__opsAlertThrottle) {
    globalWithStore.__opsAlertThrottle = new Map<string, number>();
  }

  return globalWithStore.__opsAlertThrottle;
};

const shouldSendNow = (dedupeKey: string): boolean => {
  const now = Date.now();
  const store = getAlertStore();
  const last = store.get(dedupeKey) || 0;

  if (now - last < ALERT_THROTTLE_MS) {
    return false;
  }

  store.set(dedupeKey, now);
  return true;
};

const getAlertWebhook = (): string | null => {
  return (
    process.env.PAYMENT_WEBHOOK_ALERT_WEBHOOK_URL ||
    process.env.OPS_ALERT_WEBHOOK_URL ||
    null
  );
};

export const notifyOpsAlert = async (
  payload: AlertPayload,
  options?: { dedupeKey?: string },
): Promise<void> => {
  recordReliabilityEvent({
    source: payload.source,
    message: payload.message,
    severity: payload.severity ?? "info",
    details: payload.details,
  });

  const webhook = getAlertWebhook();
  if (!webhook) {
    return;
  }

  const dedupeKey = options?.dedupeKey || `${payload.source}:${payload.message}`;
  if (!shouldSendNow(dedupeKey)) {
    return;
  }

  try {
    await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        at: new Date().toISOString(),
      }),
    });
  } catch {
    // Alerts must never break request handling.
  }
};
