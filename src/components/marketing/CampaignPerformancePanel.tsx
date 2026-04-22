"use client";
import React, { useEffect, useState } from "react";
import { getStoredAuthToken } from "@/lib/auth-context";
import { useSidebar } from "@/context/SidebarContext";

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions: number;
}

interface PerformanceData {
  businessKey: string;
  dateRange: string;
  data?: {
    rows?: Campaign[];
    summary?: {
      total_impressions: number;
      total_clicks: number;
      total_cost_micros: number;
      total_conversions: number;
    };
  };
  error?: string;
}

const DATE_RANGES = [
  { label: "Last 7 Days", value: "LAST_7_DAYS" },
  { label: "Last 30 Days", value: "LAST_30_DAYS" },
  { label: "This Month", value: "THIS_MONTH" },
  { label: "Last Month", value: "LAST_MONTH" },
];

function fmt(n: number): string {
  return n?.toLocaleString() ?? "0";
}

function fmtCost(micros: number): string {
  return `$${((micros || 0) / 1_000_000).toFixed(2)}`;
}

export function CampaignPerformancePanel() {
  const { selectedClient } = useSidebar();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("LAST_30_DAYS");

  useEffect(() => {
    if (!selectedClient?.tenant_id) return;
    const token = getStoredAuthToken();
    setLoading(true);
    setError(null);

    fetch(`/api/marketing/performance?dateRange=${dateRange}`, {
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
      .catch(() => setError("Failed to load campaign performance"))
      .finally(() => setLoading(false));
  }, [selectedClient?.tenant_id, dateRange]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Google Ads Campaigns
        </h3>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
        >
          {DATE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
          Loading…
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Summary cards */}
          {data.data?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Impressions", value: fmt(data.data.summary.total_impressions) },
                { label: "Clicks", value: fmt(data.data.summary.total_clicks) },
                { label: "Cost", value: fmtCost(data.data.summary.total_cost_micros) },
                { label: "Conversions", value: fmt(data.data.summary.total_conversions) },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-4"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Campaign table */}
          {data.data?.rows && data.data.rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Campaign</th>
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Impressions</th>
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Clicks</th>
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Cost</th>
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Conv.</th>
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.rows.map((c) => (
                    <tr
                      key={c.campaign_id}
                      className="border-b border-gray-50 dark:border-gray-800/50 last:border-0"
                    >
                      <td className="py-2.5 pr-4 font-medium text-gray-800 dark:text-white/90 max-w-[220px] truncate">
                        {c.campaign_name}
                      </td>
                      <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{fmt(c.impressions)}</td>
                      <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{fmt(c.clicks)}</td>
                      <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{fmtCost(c.cost_micros)}</td>
                      <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{fmt(c.conversions)}</td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            c.status === "ENABLED"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
              No campaign data for this period.
            </p>
          )}
        </>
      )}
    </div>
  );
}
