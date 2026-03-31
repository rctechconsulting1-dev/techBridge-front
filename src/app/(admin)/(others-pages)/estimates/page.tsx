"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Badge from "@/components/ui/badge/Badge";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId, getStoredAuthToken } from "@/lib/auth-context";
import type { Estimate, EstimateStatus } from "@/types/payments";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const authHeaders = (): Record<string, string> => {
  const token = getStoredAuthToken();
  const tid = getActiveTenantId();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tid ? { "x-tenant-id": String(tid) } : {}),
  };
};

const formatCents = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const STATUS_BADGE: Record<EstimateStatus, { color: "primary" | "success" | "error" | "warning" | "info" | "light"; label: string }> = {
  draft:    { color: "light",   label: "Draft" },
  sent:     { color: "info",    label: "Sent" },
  viewed:   { color: "primary", label: "Viewed" },
  accepted: { color: "success", label: "Accepted" },
  declined: { color: "error",   label: "Declined" },
  expired:  { color: "warning", label: "Expired" },
  paid:     { color: "success", label: "Paid" },
};

const STATUS_FILTERS: EstimateStatus[] = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
  "paid",
];

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function EstimatesListPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "">("");
  const apiBase = getApiBaseUrl();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`${apiBase}/estimates${qs}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      setEstimates(data.estimates ?? []);
    } catch {
      setEstimates([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageBreadcrumb pageTitle="Estimates" />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EstimateStatus | "")}
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="">All statuses</option>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {STATUS_BADGE[s].label}
              </option>
            ))}
          </select>
        </div>

        <Link
          href="/estimates/create"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Estimate
        </Link>
      </div>

      {/* Table */}
      <ComponentCard title="">
        {loading ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">Loading estimates...</p>
        ) : estimates.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No estimates found.</p>
            <Link
              href="/estimates/create"
              className="mt-3 inline-block text-sm font-medium text-brand-500 hover:underline"
            >
              Create your first estimate &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-3">Estimate #</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {estimates.map((est) => {
                  const badge = STATUS_BADGE[est.status] ?? STATUS_BADGE.draft;
                  return (
                    <tr
                      key={est.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {est.estimate_number}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {est.customer_name}
                        </div>
                        <div className="text-xs text-gray-500">{est.customer_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge color={badge.color} size="sm">
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCents(est.total_cents)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDate(est.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <Link
                          href={`/estimates/${est.id}`}
                          className="text-sm font-medium text-brand-500 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ComponentCard>
    </div>
  );
}
