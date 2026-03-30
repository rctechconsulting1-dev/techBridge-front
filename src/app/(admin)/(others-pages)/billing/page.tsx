"use client";

import { useCallback, useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId } from "@/lib/auth-context";

/* ────────────────────────────── Types ───────────────────────────── */

type Plan = {
  id: number;
  plan_key: string;
  name: string;
  price_monthly_cents: number;
  setup_fee_min_cents: number;
  setup_fee_max_cents: number;
  min_commitment_months: number;
  default_seat_limit: number;
  display_order: number;
  included_modules: string[];
};

type BillingSummary = {
  tenantId: number;
  planKey: string | null;
  enabledModules: string[];
  billingSummary: {
    subscriptionStatus: string | null;
    stripe_subscription_id: string | null;
  } | null;
  accessStatus: {
    allowed: boolean;
    code: string;
    reason: string | null;
  } | null;
};

/* ────────────────────────────── Helpers ──────────────────────────── */

const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

const authHeaders = () => {
  const token = getToken();
  const activeTenantId = getActiveTenantId();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeTenantId ? { "x-tenant-id": String(activeTenantId) } : {}),
  };
};

const formatCents = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);

const STATUS_BADGES: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  trialing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  past_due: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  canceled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  unpaid: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const PLAN_HIGHLIGHTS: Record<string, string> = {
  starter: "Everything you need to get online",
  professional: "Grow your business with advanced tools",
  business: "Full suite including ecommerce & reservations",
  enterprise: "Custom solutions for large operations",
};

/* ────────────────────────────── Component ────────────────────────── */

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const apiBase = getApiBaseUrl();

  const currentPlanKey = billing?.planKey ?? null;
  const subscriptionStatus =
    billing?.billingSummary?.subscriptionStatus ?? null;
  const hasActiveSubscription =
    subscriptionStatus === "active" || subscriptionStatus === "trialing";

  /* ── Load plans + tenant billing snapshot ── */

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tenantId = getActiveTenantId();
      const [plansRes, billingRes] = await Promise.all([
        fetch(`${apiBase}/plans`, {
          headers: authHeaders(),
          cache: "no-store",
        }),
        tenantId
          ? fetch(`${apiBase}/billing/entitlements/${tenantId}`, {
              headers: authHeaders(),
              cache: "no-store",
            })
          : null,
      ]);

      if (!plansRes.ok) throw new Error(`Failed to load plans (${plansRes.status})`);

      const plansData = (await plansRes.json()) as Plan[];
      setPlans(
        (Array.isArray(plansData) ? plansData : [])
          .filter((p) => p.plan_key !== "enterprise")
          .sort((a, b) => a.display_order - b.display_order),
      );

      if (billingRes?.ok) {
        setBilling((await billingRes.json()) as BillingSummary);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing data.");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Subscribe (Checkout Session) ── */

  const handleSubscribe = async (planKey: string) => {
    setActionLoading(planKey);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/billing/checkout/session`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          plan_key: planKey,
          success_url: `${window.location.origin}/billing?checkout=success`,
          cancel_url: `${window.location.origin}/billing?checkout=canceled`,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        setMessage((payload.error as string) || `Checkout failed (${res.status})`);
        return;
      }

      if (typeof payload.url === "string") {
        window.location.href = payload.url;
      } else {
        setMessage("Checkout session created but no redirect URL received.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Checkout request failed.");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Manage Subscription (Customer Portal) ── */

  const handleManage = async () => {
    setActionLoading("manage");
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/billing/portal/session`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          return_url: `${window.location.origin}/billing`,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        setMessage((payload.error as string) || `Portal failed (${res.status})`);
        return;
      }

      if (typeof payload.url === "string") {
        window.location.href = payload.url;
      } else {
        setMessage("Portal session created but no redirect URL received.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Portal request failed.");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Render ── */

  return (
    <div>
      <PageBreadcrumb pageTitle="Billing" />
      <div className="space-y-6">
        {/* Current subscription status */}
        {billing && (
          <ComponentCard title="Current Subscription">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Plan:&nbsp;</span>
                <span className="font-semibold capitalize text-gray-900 dark:text-white">
                  {currentPlanKey ?? "None"}
                </span>
              </div>
              {subscriptionStatus && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGES[subscriptionStatus] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"}`}
                >
                  {subscriptionStatus}
                </span>
              )}
              {hasActiveSubscription && (
                <button
                  type="button"
                  onClick={handleManage}
                  disabled={actionLoading === "manage"}
                  className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {actionLoading === "manage" ? "Opening..." : "Manage Subscription"}
                </button>
              )}
            </div>
          </ComponentCard>
        )}

        {/* Messages */}
        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {message}
          </p>
        )}

        {/* Plan cards */}
        {loading ? (
          <p className="text-sm text-gray-500">Loading plans...</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.plan_key === currentPlanKey;
              const isLoading = actionLoading === plan.plan_key;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-xl border p-6 transition-shadow hover:shadow-lg ${
                    isCurrent
                      ? "border-[#CD7F32] ring-2 ring-[#CD7F32]/30"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-3 left-4 rounded-full bg-[#CD7F32] px-3 py-0.5 text-xs font-semibold text-white">
                      Current Plan
                    </span>
                  )}

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {PLAN_HIGHLIGHTS[plan.plan_key] ?? ""}
                  </p>

                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatCents(plan.price_monthly_cents)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
                  </div>

                  {plan.setup_fee_min_cents > 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Setup fee: {formatCents(plan.setup_fee_min_cents)}
                      {plan.setup_fee_max_cents > plan.setup_fee_min_cents &&
                        ` – ${formatCents(plan.setup_fee_max_cents)}`}
                    </p>
                  )}

                  <ul className="mt-4 flex-1 space-y-2">
                    <li className="text-sm text-gray-600 dark:text-gray-300">
                      {plan.default_seat_limit} seat{plan.default_seat_limit > 1 ? "s" : ""} included
                    </li>
                    {plan.min_commitment_months > 0 && (
                      <li className="text-sm text-gray-600 dark:text-gray-300">
                        {plan.min_commitment_months}-month minimum
                      </li>
                    )}
                    <li className="text-sm text-gray-600 dark:text-gray-300">
                      {plan.included_modules.length} feature module{plan.included_modules.length !== 1 ? "s" : ""}
                    </li>
                  </ul>

                  <div className="mt-6">
                    {isCurrent && hasActiveSubscription ? (
                      <button
                        type="button"
                        onClick={handleManage}
                        disabled={actionLoading === "manage"}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        Manage
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSubscribe(plan.plan_key)}
                        disabled={!!actionLoading}
                        className="w-full rounded-lg bg-[#CD7F32] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {isLoading
                          ? "Redirecting..."
                          : isCurrent
                            ? "Resubscribe"
                            : "Subscribe"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
