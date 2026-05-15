"use client";
import React, { useEffect, useState } from "react";
import { getStoredAuthToken } from "@/lib/auth-context";
import { useSidebar } from "@/context/SidebarContext";

interface SearchRow {
  query?: string;
  page?: string;
  clicks: number;
  impressions: number;
  ctrPct: number;
  position: number;
}

interface SearchConsoleData {
  businessKey: string;
  data?: { rows?: SearchRow[] };
  error?: string;
}

const DATE_RANGES = [
  { label: "Last 7 Days", value: "LAST_7_DAYS" },
  { label: "Last 28 Days", value: "LAST_28_DAYS" },
  { label: "Last 90 Days", value: "LAST_90_DAYS" },
];

const DIMENSIONS = [
  { label: "Queries", value: "query" },
  { label: "Pages", value: "page" },
  { label: "Countries", value: "country" },
];

export function SearchConsolePanel() {
  const { selectedClient } = useSidebar();
  const [data, setData] = useState<SearchConsoleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("LAST_28_DAYS");
  const [dimensions, setDimensions] = useState("query");

  useEffect(() => {
    if (!selectedClient?.tenant_id) return;
    const token = getStoredAuthToken();
    setLoading(true);
    setError(null);

    fetch(
      `/api/marketing/search-console?dateRange=${dateRange}&dimensions=${dimensions}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-tenant-id": String(selectedClient.tenant_id),
        },
      },
    )
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(
            (d as { error?: string; message?: string }).error ??
            (d as { error?: string; message?: string }).message ??
            `Server error (${r.status})`,
          );
        }
        if ((d as { error?: string }).error) throw new Error((d as { error: string }).error);
        setData(d as SearchConsoleData);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load Search Console data"),
      )
      .finally(() => setLoading(false));
  }, [selectedClient?.tenant_id, dateRange, dimensions]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Search Console
        </h3>
        <div className="flex gap-2">
          <select
            value={dimensions}
            onChange={(e) => setDimensions(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
          >
            {DIMENSIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
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
        <div className="overflow-x-auto">
          {data.data?.rows && data.data.rows.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 capitalize">
                    {dimensions === "query" ? "Query" : dimensions === "page" ? "Page" : "Country"}
                  </th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Clicks</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Impressions</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">CTR</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Avg Position</th>
                </tr>
              </thead>
              <tbody>
                {data.data.rows.slice(0, 25).map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                    <td className="py-2.5 font-medium text-gray-800 dark:text-white/90 max-w-[280px] truncate">
                      {row.query ?? row.page ?? "—"}
                    </td>
                    <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{row.clicks?.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{row.impressions?.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">
                      {(row.ctrPct || 0).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">
                      {(row.position || 0).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500 text-center py-6">No search data available for this period.</p>
          )}
        </div>
      )}
    </div>
  );
}
