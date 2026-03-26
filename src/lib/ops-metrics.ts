export type ReliabilityEvent = {
  at: string;
  source: string;
  message: string;
  severity: "info" | "warning" | "error";
  details?: Record<string, unknown>;
  websiteId?: string;
  tenantId?: string;
};

export type FlowMetric = {
  at: number;
  flow: string;
  success: boolean;
  durationMs: number;
  websiteId?: string;
  tenantId?: string;
  code?: string;
};

type MetricsStore = {
  events: ReliabilityEvent[];
  flowMetrics: FlowMetric[];
};

const MAX_EVENTS = 1500;
const MAX_FLOW_METRICS = 5000;
const BACKEND_API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const OPS_INGEST_KEY = process.env.OPS_METRICS_INGEST_KEY || "";

const getStore = (): MetricsStore => {
  const globalWithStore = globalThis as typeof globalThis & {
    __opsMetricsStore?: MetricsStore;
  };

  if (!globalWithStore.__opsMetricsStore) {
    globalWithStore.__opsMetricsStore = {
      events: [],
      flowMetrics: [],
    };
  }

  return globalWithStore.__opsMetricsStore;
};

const capArraySize = <T>(items: T[], max: number): void => {
  if (items.length > max) {
    items.splice(0, items.length - max);
  }
};

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const percentile = (values: number[], pct: number): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1),
  );
  return sorted[index];
};

const eventMatchesFilter = (
  event: { websiteId?: string; tenantId?: string },
  websiteId?: string,
  tenantId?: string,
): boolean => {
  if (websiteId && event.websiteId !== websiteId) {
    return false;
  }
  if (tenantId && event.tenantId !== tenantId) {
    return false;
  }
  return true;
};

export const recordReliabilityEvent = (event: {
  source: string;
  message: string;
  severity?: "info" | "warning" | "error";
  details?: Record<string, unknown>;
}): void => {
  const websiteId =
    toStringValue(event.details?.websiteId) ||
    toStringValue(event.details?.website_id) ||
    undefined;
  const tenantId =
    toStringValue(event.details?.tenantId) ||
    toStringValue(event.details?.tenant_id) ||
    undefined;

  const store = getStore();
  store.events.push({
    at: new Date().toISOString(),
    source: event.source,
    message: event.message,
    severity: event.severity ?? "info",
    details: event.details,
    websiteId,
    tenantId,
  });

  capArraySize(store.events, MAX_EVENTS);

  // Best-effort persistence to backend; local in-memory storage remains fallback.
  if (OPS_INGEST_KEY) {
    fetch(`${BACKEND_API_BASE}/ops/alerts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ops-ingest-key": OPS_INGEST_KEY,
      },
      body: JSON.stringify({
        source: event.source,
        message: event.message,
        severity: event.severity ?? "info",
        details: event.details || {},
        websiteId,
        tenantId,
      }),
      cache: "no-store",
    }).catch(() => {
      // No-op: observability must not break request handling.
    });
  }
};

export const recordFlowMetric = (metric: {
  flow: string;
  success: boolean;
  durationMs: number;
  websiteId?: string;
  tenantId?: string;
  code?: string;
}): void => {
  const store = getStore();
  store.flowMetrics.push({
    at: Date.now(),
    flow: metric.flow,
    success: metric.success,
    durationMs: Math.max(0, Math.round(metric.durationMs)),
    websiteId: metric.websiteId,
    tenantId: metric.tenantId,
    code: metric.code,
  });

  capArraySize(store.flowMetrics, MAX_FLOW_METRICS);

  // Best-effort persistence to backend; local in-memory storage remains fallback.
  if (OPS_INGEST_KEY) {
    fetch(`${BACKEND_API_BASE}/ops/flow-metrics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ops-ingest-key": OPS_INGEST_KEY,
      },
      body: JSON.stringify({
        flow: metric.flow,
        success: metric.success,
        durationMs: metric.durationMs,
        websiteId: metric.websiteId,
        tenantId: metric.tenantId,
        code: metric.code,
      }),
      cache: "no-store",
    }).catch(() => {
      // No-op: observability must not break request handling.
    });
  }
};

const getLocalReliabilitySnapshot = (params?: {
  windowMinutes?: number;
  websiteId?: string;
  tenantId?: string;
  eventLimit?: number;
}) => {
  const windowMinutes = Math.min(Math.max(params?.windowMinutes ?? 60, 1), 24 * 60);
  const eventLimit = Math.min(Math.max(params?.eventLimit ?? 100, 1), 500);
  const websiteId = params?.websiteId;
  const tenantId = params?.tenantId;

  const sinceMs = Date.now() - windowMinutes * 60_000;
  const store = getStore();

  const recentFlowMetrics = store.flowMetrics.filter(
    (metric) =>
      metric.at >= sinceMs &&
      eventMatchesFilter(metric, websiteId, tenantId),
  );

  const flowMap = new Map<
    string,
    {
      requests: number;
      failures: number;
      durations: number[];
      byCode: Record<string, number>;
    }
  >();

  for (const metric of recentFlowMetrics) {
    const existing =
      flowMap.get(metric.flow) ||
      {
        requests: 0,
        failures: 0,
        durations: [],
        byCode: {},
      };

    existing.requests += 1;
    if (!metric.success) {
      existing.failures += 1;
    }
    existing.durations.push(metric.durationMs);

    if (metric.code) {
      existing.byCode[metric.code] = (existing.byCode[metric.code] || 0) + 1;
    }

    flowMap.set(metric.flow, existing);
  }

  const flows = Array.from(flowMap.entries())
    .map(([flow, value]) => ({
      flow,
      requests: value.requests,
      failures: value.failures,
      successRate:
        value.requests === 0
          ? 100
          : Number((((value.requests - value.failures) / value.requests) * 100).toFixed(2)),
      avgDurationMs:
        value.durations.length === 0
          ? 0
          : Number(
              (
                value.durations.reduce((sum, item) => sum + item, 0) /
                value.durations.length
              ).toFixed(1),
            ),
      p95DurationMs: percentile(value.durations, 95),
      byCode: value.byCode,
    }))
    .sort((a, b) => {
      if (b.failures !== a.failures) {
        return b.failures - a.failures;
      }
      return b.requests - a.requests;
    });

  const events = store.events
    .filter(
      (event) =>
        new Date(event.at).getTime() >= sinceMs &&
        eventMatchesFilter(event, websiteId, tenantId),
    )
    .slice(-eventLimit)
    .reverse();

  const byWebsite: Record<
    string,
    { requests: number; failures: number; events: number }
  > = {};

  for (const metric of recentFlowMetrics) {
    if (!metric.websiteId) {
      continue;
    }

    if (!byWebsite[metric.websiteId]) {
      byWebsite[metric.websiteId] = { requests: 0, failures: 0, events: 0 };
    }

    byWebsite[metric.websiteId].requests += 1;
    if (!metric.success) {
      byWebsite[metric.websiteId].failures += 1;
    }
  }

  for (const event of events) {
    if (!event.websiteId) {
      continue;
    }

    if (!byWebsite[event.websiteId]) {
      byWebsite[event.websiteId] = { requests: 0, failures: 0, events: 0 };
    }

    byWebsite[event.websiteId].events += 1;
  }

  return {
    dataSource: "memory" as const,
    generatedAt: new Date().toISOString(),
    windowMinutes,
    filters: {
      websiteId: websiteId ?? null,
      tenantId: tenantId ?? null,
    },
    summary: {
      totalRequests: recentFlowMetrics.length,
      totalFailures: recentFlowMetrics.filter((item) => !item.success).length,
      totalAlerts: events.length,
    },
    flows,
    byWebsite,
    events,
  };
};

export const getReliabilitySnapshot = getLocalReliabilitySnapshot;

export const getPersistentReliabilitySnapshot = async (params?: {
  windowMinutes?: number;
  websiteId?: string;
  tenantId?: string;
  eventLimit?: number;
}) => {
  if (!OPS_INGEST_KEY) {
    return getLocalReliabilitySnapshot(params);
  }

  const query = new URLSearchParams();
  if (params?.windowMinutes) {
    query.set("windowMinutes", String(params.windowMinutes));
  }
  if (params?.websiteId) {
    query.set("websiteId", params.websiteId);
  }
  if (params?.tenantId) {
    query.set("tenantId", params.tenantId);
  }
  if (params?.eventLimit) {
    query.set("eventLimit", String(params.eventLimit));
  }

  try {
    const res = await fetch(`${BACKEND_API_BASE}/ops/reliability?${query.toString()}`, {
      method: "GET",
      headers: {
        "x-ops-ingest-key": OPS_INGEST_KEY,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return getLocalReliabilitySnapshot(params);
    }

    const payload = (await res.json()) as Record<string, unknown>;
    return {
      ...payload,
      dataSource: "persistent" as const,
    };
  } catch {
    return getLocalReliabilitySnapshot(params);
  }
};
