"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId, getStoredAuthToken } from "@/lib/auth-context";
import type { CreateEstimatePayload } from "@/types/payments";

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

const LABEL =
  "mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";
const INPUT =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

type LineItemDraft = { description: string; quantity: number; unit_price_cents: number };

const emptyLine = (): LineItemDraft => ({
  description: "",
  quantity: 1,
  unit_price_cents: 0,
});

const formatCents = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function CreateEstimatePage() {
  const router = useRouter();
  const apiBase = getApiBaseUrl();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [taxCents, setTaxCents] = useState(0);
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  /* ── Line item helpers ── */

  const updateLine = (idx: number, field: keyof LineItemDraft, value: string | number) => {
    setLineItems((prev) =>
      prev.map((li, i) => (i === idx ? { ...li, [field]: value } : li)),
    );
  };

  const removeLine = (idx: number) => {
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const addLine = () => setLineItems((prev) => [...prev, emptyLine()]);

  /* ── Totals ── */

  const subtotal = lineItems.reduce(
    (sum, li) => sum + Math.round((li.quantity || 0) * (li.unit_price_cents || 0)),
    0,
  );
  const total = subtotal + (taxCents || 0);

  /* ── Submit ── */

  const submit = async () => {
    if (!customerName.trim() || !customerEmail.trim()) {
      toast.error("Customer name and email are required");
      return;
    }
    if (lineItems.every((li) => !li.description.trim())) {
      toast.error("Add at least one line item");
      return;
    }

    setSaving(true);
    try {
      const payload: CreateEstimatePayload = {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        tax_cents: taxCents,
        line_items: lineItems
          .filter((li) => li.description.trim())
          .map((li) => ({
            description: li.description.trim(),
            quantity: li.quantity || 1,
            unit_price_cents: li.unit_price_cents || 0,
          })),
      };

      const res = await fetch(`${apiBase}/estimates`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Create failed (${res.status})`);
      }

      const created = await res.json();
      toast.success(`Estimate ${created.estimate_number} created!`);
      router.push(`/estimates/${created.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create estimate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="New Estimate" />

      <div className="space-y-6">
        {/* Customer Info */}
        <ComponentCard title="Customer Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={LABEL}>Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="John Smith"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Email *</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="john@example.com"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Phone</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className={INPUT}
              />
            </div>
          </div>
        </ComponentCard>

        {/* Line Items */}
        <ComponentCard title="Line Items">
          <div className="space-y-3">
            {/* Header */}
            <div className="hidden grid-cols-[1fr_80px_120px_100px_40px] gap-3 text-xs font-medium uppercase tracking-wide text-gray-500 sm:grid">
              <span>Description</span>
              <span>Qty</span>
              <span>Unit Price (¢)</span>
              <span className="text-right">Line Total</span>
              <span />
            </div>

            {lineItems.map((li, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800 sm:grid-cols-[1fr_80px_120px_100px_40px] sm:border-0 sm:p-0"
              >
                <input
                  type="text"
                  value={li.description}
                  onChange={(e) => updateLine(idx, "description", e.target.value)}
                  placeholder="Service or item description"
                  className={INPUT}
                />
                <input
                  type="number"
                  min={1}
                  value={li.quantity}
                  onChange={(e) => updateLine(idx, "quantity", Number(e.target.value))}
                  className={INPUT}
                />
                <input
                  type="number"
                  min={0}
                  value={li.unit_price_cents}
                  onChange={(e) =>
                    updateLine(idx, "unit_price_cents", Number(e.target.value))
                  }
                  className={INPUT}
                />
                <div className="flex items-center justify-end text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formatCents(Math.round((li.quantity || 0) * (li.unit_price_cents || 0)))}
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  disabled={lineItems.length <= 1}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-900/20"
                  title="Remove line"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addLine}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
                <path
                  d="M8 3v10M3 8h10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Add Line Item
            </button>
          </div>
        </ComponentCard>

        {/* Summary */}
        <ComponentCard title="Summary">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, project notes..."
                className={`${INPUT} h-auto`}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCents(subtotal)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500">Tax (¢)</label>
                <input
                  type="number"
                  min={0}
                  value={taxCents}
                  onChange={(e) => setTaxCents(Number(e.target.value))}
                  className="h-9 w-28 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base font-bold dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-gray-900 dark:text-white">{formatCents(total)}</span>
              </div>
            </div>
          </div>
        </ComponentCard>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/estimates")}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Estimate"}
          </button>
        </div>
      </div>
    </div>
  );
}
