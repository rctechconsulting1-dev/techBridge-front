"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId, getStoredAuthToken } from "@/lib/auth-context";
import type { PaymentConfig } from "@/types/payments";

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
    minimumFractionDigits: 0,
  }).format(cents / 100);

/* ── Style tokens ────────────────────────────────────────────────────────── */

const LABEL =
  "mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";
const INPUT =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const SELECT =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const TOGGLE_ROW = "flex items-center justify-between gap-4 py-3";
const TOGGLE_LABEL = "text-sm font-medium text-gray-700 dark:text-gray-300";
const HINT = "mt-0.5 text-xs text-gray-400 dark:text-gray-500";

/* ── Toggle component ────────────────────────────────────────────────────── */

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition duration-150 ease-linear ${
        disabled
          ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
          : checked
            ? "bg-brand-500"
            : "bg-gray-200 dark:bg-white/10"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-theme-sm transition duration-150 ease-linear transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        } mt-0.5`}
      />
    </button>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function PaymentConfigPage() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const apiBase = getApiBaseUrl();

  /* ── Load ── */

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/payment-config`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      setConfig(await res.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load payment config");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Save ── */

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/payment-config`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Save failed (${res.status})`);
      }
      const saved = await res.json();
      setConfig({ ...saved, _persisted: true });
      toast.success("Payment config saved!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  /* ── Updater shorthand ── */

  const set = <K extends keyof PaymentConfig>(key: K, value: PaymentConfig[K]) =>
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));

  /* ── Render ── */

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Payment Config" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Payment Config" />
        <p className="text-sm text-red-500">Unable to load payment configuration.</p>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Payment Config" />

      <div className="space-y-6">
        {/* ── Booking Deposits ── */}
        <ComponentCard
          title="Booking Deposits"
          desc="Configure how deposits are collected when customers book appointments."
        >
          <div className="space-y-4">
            <div className={TOGGLE_ROW}>
              <div>
                <span className={TOGGLE_LABEL}>Enable Deposits</span>
                <p className={HINT}>Collect a deposit when a booking is confirmed</p>
              </div>
              <Toggle checked={config.deposit_enabled} onChange={(v) => set("deposit_enabled", v)} />
            </div>

            {config.deposit_enabled && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Deposit Type</label>
                  <select
                    value={config.deposit_type}
                    onChange={(e) => set("deposit_type", e.target.value as "fixed" | "percentage")}
                    className={SELECT}
                  >
                    <option value="percentage">Percentage of service price</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>
                    {config.deposit_type === "percentage" ? "Deposit %" : "Amount (cents)"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={config.deposit_type === "percentage" ? 100 : 5000000}
                    value={config.deposit_value}
                    onChange={(e) => set("deposit_value", Number(e.target.value))}
                    className={INPUT}
                  />
                  {config.deposit_type === "fixed" && config.deposit_value > 0 && (
                    <p className={HINT}>{formatCents(config.deposit_value)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </ComponentCard>

        {/* ── Estimates / Quotes ── */}
        <ComponentCard
          title="Estimates & Quotes"
          desc="Send itemized estimates to customers and collect payment when accepted."
        >
          <div className="space-y-4">
            <div className={TOGGLE_ROW}>
              <div>
                <span className={TOGGLE_LABEL}>Enable Estimates</span>
                <p className={HINT}>Allow creating and sending itemized quotes</p>
              </div>
              <Toggle
                checked={config.estimates_enabled}
                onChange={(v) => set("estimates_enabled", v)}
              />
            </div>

            {config.estimates_enabled && (
              <div className="max-w-xs">
                <label className={LABEL}>Default Valid Days</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={config.estimate_valid_days}
                  onChange={(e) => set("estimate_valid_days", Number(e.target.value))}
                  className={INPUT}
                />
                <p className={HINT}>Days before an estimate automatically expires</p>
              </div>
            )}
          </div>
        </ComponentCard>

        {/* ── Reservations ── */}
        <ComponentCard
          title="Reservations"
          desc="Accept time-slot reservations for restaurants, venues, or event spaces."
        >
          <div className="space-y-4">
            <div className={TOGGLE_ROW}>
              <div>
                <span className={TOGGLE_LABEL}>Enable Reservations</span>
                <p className={HINT}>Allow customers to reserve time slots</p>
              </div>
              <Toggle
                checked={config.reservations_enabled}
                onChange={(v) => set("reservations_enabled", v)}
              />
            </div>

            {config.reservations_enabled && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Reservation Deposit Type</label>
                  <select
                    value={config.reservation_deposit_type}
                    onChange={(e) =>
                      set(
                        "reservation_deposit_type",
                        e.target.value as "fixed" | "percentage" | "none",
                      )
                    }
                    className={SELECT}
                  >
                    <option value="none">No deposit required</option>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>
                {config.reservation_deposit_type !== "none" && (
                  <div>
                    <label className={LABEL}>
                      {config.reservation_deposit_type === "percentage"
                        ? "Deposit %"
                        : "Amount (cents)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={
                        config.reservation_deposit_type === "percentage" ? 100 : 5000000
                      }
                      value={config.reservation_deposit_value}
                      onChange={(e) =>
                        set("reservation_deposit_value", Number(e.target.value))
                      }
                      className={INPUT}
                    />
                    {config.reservation_deposit_type === "fixed" &&
                      config.reservation_deposit_value > 0 && (
                        <p className={HINT}>
                          {formatCents(config.reservation_deposit_value)}
                        </p>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ComponentCard>

        {/* ── E-Commerce ── */}
        <ComponentCard
          title="E-Commerce Checkout"
          desc="Enable Stripe-powered product checkout on your website."
        >
          <div className={TOGGLE_ROW}>
            <div>
              <span className={TOGGLE_LABEL}>Enable Checkout</span>
              <p className={HINT}>Allow customers to purchase products online</p>
            </div>
            <Toggle
              checked={config.ecommerce_checkout_enabled}
              onChange={(v) => set("ecommerce_checkout_enabled", v)}
            />
          </div>
        </ComponentCard>

        {/* ── Platform Fee ── */}
        <ComponentCard
          title="Platform Fee"
          desc="Set the percentage fee deducted from each transaction as a platform application fee."
        >
          <div className="max-w-xs">
            <label className={LABEL}>Fee Percent</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={config.platform_fee_percent}
              onChange={(e) => set("platform_fee_percent", Number(e.target.value))}
              className={INPUT}
            />
            <p className={HINT}>0 = no platform fee. Applied to Connect payments.</p>
          </div>
        </ComponentCard>

        {/* ── Save ── */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
