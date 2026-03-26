"use client";

import { useEffect, useMemo, useState } from "react";
import EntitlementGate from "@/components/common/EntitlementGate";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";

type FlowSummary = {
  flow: string;
  requests: number;
  failures: number;
  successRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
};

type ReliabilityEvent = {
  at: string;
  source: string;
  message: string;
  severity: "info" | "warning" | "error";
  websiteId?: string;
};

type Snapshot = {
  generatedAt: string;
  windowMinutes: number;
  dataSource?: "persistent" | "memory";
  summary: {
    totalRequests: number;
    totalFailures: number;
    totalAlerts: number;
  };
  flows: FlowSummary[];
  byWebsite: Record<string, { requests: number; failures: number; events: number }>;
  events: ReliabilityEvent[];
};

const DEFAULT_WINDOW = 60;

export default function ReliabilityPage() {
  const [windowMinutes, setWindowMinutes] = useState(DEFAULT_WINDOW);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const loadSnapshot = async (windowValue: number) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/ops/reliability?windowMinutes=${windowValue}&eventLimit=50`,
        {
          cache: "no-store",
        },
      );

      if (!res.ok) {
        const text = await res.text();
        setError(text || `Failed to load reliability snapshot (${res.status})`);
        setSnapshot(null);
        return;
      }

      const data = (await res.json()) as Snapshot;
      setSnapshot(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load reliability snapshot.",
      );
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshot(windowMinutes);
  }, [windowMinutes]);

  const totalSuccess = useMemo(() => {
    if (!snapshot) {
      return 0;
    }

    return Math.max(0, snapshot.summary.totalRequests - snapshot.summary.totalFailures);
  }, [snapshot]);

  return (
    <EntitlementGate
      requiredRoles={["admin", "platform_admin"]}
      pageTitle="Reliability Dashboard"
    >
      <div>
        <PageBreadcrumb pageTitle="Reliability Dashboard" />
        <div className="space-y-6">
        <ComponentCard title="Controls">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={windowMinutes}
              onChange={(event) => setWindowMinutes(Number(event.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value={15}>Last 15 minutes</option>
              <option value={60}>Last 60 minutes</option>
              <option value={240}>Last 4 hours</option>
              <option value={1440}>Last 24 hours</option>
            </select>
            <button
              type="button"
              onClick={() => loadSnapshot(windowMinutes)}
              disabled={loading}
              className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            {snapshot ? (
              <span className="text-xs text-gray-500 dark:text-gray-300">
                Updated {new Date(snapshot.generatedAt).toLocaleString()}
              </span>
            ) : null}
            {snapshot ? (
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  snapshot.dataSource === "persistent"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                }`}
              >
                Data source: {snapshot.dataSource === "persistent" ? "Persistent DB" : "Memory fallback"}
              </span>
            ) : null}
          </div>
          {error ? (
            <p className="mt-3 text-sm text-red-500">{error}</p>
          ) : null}
        </ComponentCard>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ComponentCard title="Requests">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {snapshot?.summary.totalRequests ?? 0}
            </p>
          </ComponentCard>
          <ComponentCard title="Failures">
            <p className="text-2xl font-semibold text-red-600">
              {snapshot?.summary.totalFailures ?? 0}
            </p>
          </ComponentCard>
          <ComponentCard title="Successful">
            <p className="text-2xl font-semibold text-green-600">{totalSuccess}</p>
          </ComponentCard>
        </div>

        <ComponentCard title="Flow Health">
          {snapshot?.flows?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-2 py-2">Flow</th>
                    <th className="px-2 py-2">Requests</th>
                    <th className="px-2 py-2">Failures</th>
                    <th className="px-2 py-2">Success %</th>
                    <th className="px-2 py-2">Avg ms</th>
                    <th className="px-2 py-2">P95 ms</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.flows.map((flow) => (
                    <tr key={flow.flow} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-2 py-2 font-medium">{flow.flow}</td>
                      <td className="px-2 py-2">{flow.requests}</td>
                      <td className="px-2 py-2">{flow.failures}</td>
                      <td className="px-2 py-2">{flow.successRate}</td>
                      <td className="px-2 py-2">{flow.avgDurationMs}</td>
                      <td className="px-2 py-2">{flow.p95DurationMs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-300">
              No flow metrics captured yet for this time window.
            </p>
          )}
        </ComponentCard>

        <ComponentCard title="Recent Alerts">
          {snapshot?.events?.length ? (
            <div className="space-y-2">
              {snapshot.events.map((event, index) => (
                <div
                  key={`${event.at}-${event.source}-${index}`}
                  className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {event.source}: {event.message}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-300">
                      {new Date(event.at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                    severity: {event.severity}
                    {event.websiteId ? ` | website: ${event.websiteId}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-300">
              No alerts recorded in this time window.
            </p>
          )}
        </ComponentCard>
        </div>
      </div>
    </EntitlementGate>
  );
}
