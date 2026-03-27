"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

type AccessStatus = {
  allowed: boolean;
  accessLevel: string;
  billingFeatures: boolean;
  code: string;
  reason: string | null;
  billingStatus: string | null;
  tenantStatus: string | null;
  graceExpiresAt?: string | null;
  accessExpiresAt?: string | null;
};

const SEVERITY_STYLES: Record<string, string> = {
  warning:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
  error:
    "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200",
  info:
    "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200",
};

function getSeverity(code: string): string {
  if (code === "TENANT_SUSPENDED" || code === "TENANT_INACTIVE") return "error";
  if (code === "BILLING_GRACE_EXPIRED" || code === "BILLING_UNPAID") return "error";
  if (code.startsWith("BILLING_GRACE_ACTIVE") || code === "BILLING_PAST_DUE") return "warning";
  if (code === "CANCELED_PERIOD_ACTIVE") return "warning";
  if (code === "BILLING_CANCELED") return "error";
  return "info";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getMessage(access: AccessStatus): string | null {
  switch (access.code) {
    case "BILLING_GRACE_ACTIVE":
      return `Your payment is overdue. Please update your billing info before ${formatDate(access.graceExpiresAt)} to avoid losing access to premium features.`;
    case "BILLING_GRACE_EXPIRED":
      return "Your grace period has expired. Premium features are disabled until payment is resolved.";
    case "BILLING_PAST_DUE":
      return "Your subscription payment is past due. Please update your payment method.";
    case "BILLING_UNPAID":
      return "Your subscription is unpaid. Most features are restricted to read-only access.";
    case "BILLING_CANCELED":
      return "Your subscription has been canceled. Data is preserved but features are restricted.";
    case "CANCELED_PERIOD_ACTIVE":
      return `Your subscription was canceled but remains active until ${formatDate(access.accessExpiresAt)}.`;
    case "TENANT_SUSPENDED":
      return "This account has been suspended. Contact support for assistance.";
    case "TENANT_INACTIVE":
      return "This account is inactive. Contact your administrator.";
    default:
      return access.reason;
  }
}

// Codes that indicate a degraded state worth showing a banner for
const DEGRADED_CODES = new Set([
  "BILLING_GRACE_ACTIVE",
  "BILLING_GRACE_EXPIRED",
  "BILLING_PAST_DUE",
  "BILLING_UNPAID",
  "BILLING_CANCELED",
  "CANCELED_PERIOD_ACTIVE",
  "TENANT_SUSPENDED",
  "TENANT_INACTIVE",
]);

export default function BillingStatusBanner() {
  const [access, setAccess] = useState<AccessStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await apiClient.get<{
          accessStatus?: AccessStatus;
        }>("/entitlements/current");
        if (!cancelled && data?.accessStatus) {
          setAccess(data.accessStatus);
        }
      } catch {
        // Silently fail — banner is non-critical
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!access || !DEGRADED_CODES.has(access.code)) {
    return null;
  }

  const message = getMessage(access);
  if (!message) return null;

  const severity = getSeverity(access.code);
  const styles = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;

  return (
    <div className={`mx-4 mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${styles}`}>
      {message}
    </div>
  );
}
