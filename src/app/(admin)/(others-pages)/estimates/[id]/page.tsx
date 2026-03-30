"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
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
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(
    cents / 100,
  );

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

const STATUS_BADGE: Record<
  EstimateStatus,
  { color: "primary" | "success" | "error" | "warning" | "info" | "light"; label: string }
> = {
  draft: { color: "light", label: "Draft" },
  sent: { color: "info", label: "Sent" },
  viewed: { color: "primary", label: "Viewed" },
  accepted: { color: "success", label: "Accepted" },
  declined: { color: "error", label: "Declined" },
  expired: { color: "warning", label: "Expired" },
  paid: { color: "success", label: "Paid" },
};

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const apiBase = getApiBaseUrl();

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* ── Load ── */

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/estimates/${id}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setEstimate(await res.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load estimate");
    } finally {
      setLoading(false);
    }
  }, [apiBase, id]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Actions ── */

  const doAction = async (action: string, method = "POST") => {
    setActionLoading(action);
    try {
      const res = await fetch(`${apiBase}/estimates/${id}/${action}`, {
        method,
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Action failed (${res.status})`);
      }
      toast.success(`Estimate ${action} successful`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckout = async () => {
    setActionLoading("checkout");
    try {
      const res = await fetch(`${apiBase}/estimates/${id}/checkout`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          success_url: `${window.location.origin}/estimates/${id}?checkout=success`,
          cancel_url: `${window.location.origin}/estimates/${id}?checkout=canceled`,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Checkout failed (${res.status})`);
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.info("Checkout session created");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Estimate" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Estimate" />
        <p className="text-sm text-red-500">Estimate not found.</p>
      </div>
    );
  }

  const badge = STATUS_BADGE[estimate.status] ?? STATUS_BADGE.draft;
  const canSend = estimate.status === "draft";
  const canCollect = estimate.status === "accepted";

  return (
    <div>
      <PageBreadcrumb pageTitle={`Estimate ${estimate.estimate_number}`} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge color={badge.color}>{badge.label}</Badge>
            <span className="text-sm text-gray-500">
              Created {formatDate(estimate.created_at)}
            </span>
            {estimate.valid_until && (
              <span className="text-sm text-gray-500">
                &middot; Valid until {formatDate(estimate.valid_until)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {canSend && (
              <button
                type="button"
                onClick={() => doAction("send")}
                disabled={actionLoading === "send"}
                className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-500 hover:bg-brand-50 disabled:opacity-50 dark:hover:bg-brand-500/10"
              >
                {actionLoading === "send" ? "Sending..." : "Send to Customer"}
              </button>
            )}
            {canCollect && (
              <button
                type="button"
                onClick={handleCheckout}
                disabled={actionLoading === "checkout"}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {actionLoading === "checkout" ? "Processing..." : "Collect Payment"}
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push("/estimates")}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Back
            </button>
          </div>
        </div>

        {/* Customer */}
        <ComponentCard title="Customer">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <span className="text-xs font-medium uppercase text-gray-400">Name</span>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {estimate.customer_name}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-gray-400">Email</span>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {estimate.customer_email}
              </p>
            </div>
            {estimate.customer_phone && (
              <div>
                <span className="text-xs font-medium uppercase text-gray-400">Phone</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {estimate.customer_phone}
                </p>
              </div>
            )}
          </div>
          {estimate.notes && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {estimate.notes}
            </div>
          )}
        </ComponentCard>

        {/* Line Items */}
        <ComponentCard title="Line Items">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {(estimate.line_items ?? []).map((li) => (
                  <tr key={li.id}>
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                      {li.description}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                      {li.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                      {formatCents(li.unit_price_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCents(li.line_total_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200 dark:border-gray-700">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-500">
                    Subtotal
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {formatCents(estimate.subtotal_cents)}
                  </td>
                </tr>
                {estimate.tax_cents > 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-500">
                      Tax
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCents(estimate.tax_cents)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-right text-base font-bold text-gray-700 dark:text-gray-300"
                  >
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-white">
                    {formatCents(estimate.total_cents)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
