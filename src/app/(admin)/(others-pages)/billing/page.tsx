"use client";

import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import EntitlementGate from "@/components/common/EntitlementGate";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId } from "@/lib/auth-context";

type StripeSubscription = {
  id: number;
  stripe_subscription_id: string | null;
  stripe_product_id: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
};

type StripeProduct = {
  id: number;
  stripe_product_id: string | null;
  name?: string | null;
  price?: string | number | null;
};

type ChangeType = "upgrade" | "downgrade";
type Behavior = "immediate" | "period_end";

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

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<StripeSubscription[]>([]);
  const [products, setProducts] = useState<StripeProduct[]>([]);

  const [subscriptionId, setSubscriptionId] = useState<number | null>(null);
  const [nextProductId, setNextProductId] = useState<string>("");
  const [changeType, setChangeType] = useState<ChangeType>("upgrade");
  const [effectiveBehavior, setEffectiveBehavior] = useState<Behavior>("immediate");

  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<Record<string, unknown> | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const apiBase = getApiBaseUrl();

  const selectedSubscription = useMemo(
    () => subscriptions.find((sub) => sub.id === subscriptionId) || null,
    [subscriptionId, subscriptions],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [subRes, prodRes] = await Promise.all([
          fetch(`${apiBase}/stripe/subscriptions`, {
            method: "GET",
            headers: authHeaders(),
            cache: "no-store",
          }),
          fetch(`${apiBase}/stripe/products`, {
            method: "GET",
            headers: authHeaders(),
            cache: "no-store",
          }),
        ]);

        if (!subRes.ok) {
          throw new Error(`Failed to load subscriptions (${subRes.status})`);
        }
        if (!prodRes.ok) {
          throw new Error(`Failed to load products (${prodRes.status})`);
        }

        const subs = (await subRes.json()) as StripeSubscription[];
        const prods = (await prodRes.json()) as StripeProduct[];
        setSubscriptions(Array.isArray(subs) ? subs : []);
        setProducts(Array.isArray(prods) ? prods : []);

        if (Array.isArray(subs) && subs.length > 0) {
          const initialSubscriptionId = subs[0].id;
          setSubscriptionId(initialSubscriptionId);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load billing operations data.",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [apiBase]);

  const runPreview = async () => {
    if (!subscriptionId || !nextProductId) {
      setResultMessage("Select subscription and next product before previewing.");
      return;
    }

    setPreviewLoading(true);
    setResultMessage(null);
    setPreviewResult(null);
    try {
      const res = await fetch(
        `${apiBase}/stripe/subscriptions/${subscriptionId}/plan-change-preview`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            nextStripeProductId: nextProductId,
            changeType,
            effectiveBehavior,
          }),
        },
      );

      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setResultMessage((payload.error as string) || `Preview failed (${res.status})`);
        return;
      }

      setPreviewResult(payload);
    } catch (previewError) {
      setResultMessage(
        previewError instanceof Error ? previewError.message : "Preview failed.",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const applyChange = async () => {
    if (!subscriptionId || !nextProductId) {
      setResultMessage("Select subscription and next product before applying.");
      return;
    }

    setApplyLoading(true);
    setResultMessage(null);
    try {
      const res = await fetch(`${apiBase}/stripe/subscriptions/${subscriptionId}/plan-change`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          nextStripeProductId: nextProductId,
          changeType,
          effectiveBehavior,
          metadata: {
            source: "frontend_billing_ops",
          },
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setResultMessage((payload.error as string) || `Plan change failed (${res.status})`);
        return;
      }

      setResultMessage(
        `Plan change request created. Status: ${String(payload.status || "requested")}`,
      );
      setPreviewResult(payload);
    } catch (applyError) {
      setResultMessage(
        applyError instanceof Error ? applyError.message : "Plan change failed.",
      );
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <EntitlementGate
      requiredModules={["checkout_ecommerce"]}
      requiredFeatures={["commerce.checkout.manage"]}
      requiredRoles={["admin", "platform_admin"]}
      pageTitle="Billing Operations"
    >
      <div>
        <PageBreadcrumb pageTitle="Billing Operations" />
        <div className="space-y-6">
          <ComponentCard
            title="Subscription Plan Change"
            desc="Preview and apply tenant subscription product changes using backend operational endpoints."
          >
            {loading ? <p className="text-sm text-gray-500">Loading billing data...</p> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">
                  Subscription
                </span>
                <select
                  value={subscriptionId ?? ""}
                  onChange={(event) => setSubscriptionId(Number(event.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  {subscriptions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      #{sub.id} | {sub.status || "unknown"} | current product: {sub.stripe_product_id || "n/a"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">
                  Next Product
                </span>
                <select
                  value={nextProductId}
                  onChange={(event) => setNextProductId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="">Select product...</option>
                  {products.map((product) => (
                    <option key={product.id} value={String(product.id)}>
                      {product.name || product.stripe_product_id || `product#${product.id}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">
                  Change Type
                </span>
                <select
                  value={changeType}
                  onChange={(event) => setChangeType(event.target.value as ChangeType)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="upgrade">Upgrade</option>
                  <option value="downgrade">Downgrade</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">
                  Effective Behavior
                </span>
                <select
                  value={effectiveBehavior}
                  onChange={(event) => setEffectiveBehavior(event.target.value as Behavior)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="immediate">Immediate</option>
                  <option value="period_end">Period End</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={runPreview}
                disabled={previewLoading || loading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {previewLoading ? "Previewing..." : "Preview Change"}
              </button>
              <button
                type="button"
                onClick={applyChange}
                disabled={applyLoading || loading}
                className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {applyLoading ? "Applying..." : "Apply / Request Change"}
              </button>
            </div>

            {selectedSubscription ? (
              <p className="text-xs text-gray-500 dark:text-gray-300">
                Selected subscription external ID: {selectedSubscription.stripe_subscription_id || "none"}
              </p>
            ) : null}

            {resultMessage ? <p className="text-sm text-gray-700 dark:text-gray-200">{resultMessage}</p> : null}

            {previewResult ? (
              <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                {JSON.stringify(previewResult, null, 2)}
              </pre>
            ) : null}
          </ComponentCard>
        </div>
      </div>
    </EntitlementGate>
  );
}
