"use client";
import React, { useEffect, useState } from "react";
import { getStoredAuthToken } from "@/lib/auth-context";
import { useSidebar } from "@/context/SidebarContext";

interface ChannelRow {
  channel: string;
  sessions: number;
  users: number;
  bounceRatePct: number;
  conversions: number;
}

interface TopPage {
  page: string;
  sessions: number;
  conversions: number;
  bounceRatePct: number;
}

interface AnalyticsData {
  businessKey: string;
  overview?: { data?: { byChannel?: ChannelRow[]; totals?: Record<string, number> } };
  topPages?: { data?: { pages?: TopPage[] } };
  error?: string;
}

const DATE_RANGES = [
  { label: "Last 7 Days", value: "LAST_7_DAYS" },
  { label: "Last 30 Days", value: "LAST_30_DAYS" },
  { label: "This Month", value: "THIS_MONTH" },
];

function pct(n: number) {
  return `${(n || 0).toFixed(1)}%`;
}

export function AnalyticsPanel() {
  const { selectedClient } = useSidebar();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("LAST_30_DAYS");
  const [tab, setTab] = useState<"channels" | "pages">("channels");

  useEffect(() => {
    if (!selectedClient?.tenant_id) return;
    const token = getStoredAuthToken();
    setLoading(true);
    setError(null);

    fetch(`/api/marketing/analytics?dateRange=${dateRange}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-tenant-id": String(selectedClient.tenant_id),
      },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [selectedClient?.tenant_id, dateRange]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          GA4 Traffic Analytics
        </h3>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
        >
          {DATE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-100 dark:border-gray-800">
        {(["channels", "pages"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg transition-colors ${
              tab === t
                ? "text-brand-500 border-b-2 border-brand-500"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading…</div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {tab === "channels" && (
            <div className="overflow-x-auto">
              {data.overview?.data?.byChannel && data.overview.data.byChannel.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                      <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Channel</th>
                      <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Sessions</th>
                      <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Users</th>
                      <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Bounce</th>
                      <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.overview.data!.byChannel!.map((c, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                        <td className="py-2.5 font-medium text-gray-800 dark:text-white/90">{c.channel}</td>
                        <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{c.sessions?.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{c.users?.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{pct(c.bounceRatePct)}</td>
                        <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{c.conversions?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">No channel data available.</p>
              )}
            </div>
          )}

          {tab === "pages" && (
            <div className="overflow-x-auto">
              {data.topPages?.data?.pages && data.topPages.data.pages.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                      <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Page</th>
                      <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Sessions</th>
                      <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Conv.</th>
                      <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Bounce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.data.pages.map((p, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                        <td className="py-2.5 font-medium text-gray-800 dark:text-white/90 max-w-[260px] truncate">{p.page}</td>
                        <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{p.sessions?.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{p.conversions?.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{pct(p.bounceRatePct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">No page data available.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
