"use client";

import { apiClient } from "@/lib/api-client";
import {
  createEntitlementSnapshot,
  hasAnyFeature,
  hasAnyModule,
  normalizeEntitlementValues,
} from "@/lib/entitlements";
import React, { useEffect, useMemo, useState } from "react";

type SessionShape = {
  enabledModules?: string[];
  enabledFeatures?: string[];
  role?: string;
};

type EntitlementGateProps = {
  requiredModules?: string[];
  requiredFeatures?: string[];
  requiredRoles?: string[];
  pageTitle: string;
  deniedMessage?: string;
  children: React.ReactNode;
};

export default function EntitlementGate({
  requiredModules,
  requiredFeatures,
  requiredRoles,
  pageTitle,
  deniedMessage,
  children,
}: EntitlementGateProps) {
  const [enabledModules, setEnabledModules] = useState<string[] | null>(null);
  const [enabledFeatures, setEnabledFeatures] = useState<string[] | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const session = (await apiClient.getSession()) as SessionShape | null;
        if (!active) return;

        setEnabledModules(
          Array.isArray(session?.enabledModules)
            ? normalizeEntitlementValues(session.enabledModules)
            : null,
        );
        setEnabledFeatures(
          Array.isArray(session?.enabledFeatures)
            ? normalizeEntitlementValues(session.enabledFeatures)
            : null,
        );
        setCurrentRole(typeof session?.role === "string" ? session.role : null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    hydrate();

    return () => {
      active = false;
    };
  }, []);

  const snapshot = useMemo(
    () => createEntitlementSnapshot(enabledModules, enabledFeatures),
    [enabledFeatures, enabledModules],
  );

  const hasEntitlementPayload =
    (enabledModules && enabledModules.length > 0) ||
    (enabledFeatures && enabledFeatures.length > 0);

  const roleAllowed =
    !requiredRoles || requiredRoles.length === 0
      ? true
      : currentRole
        ? requiredRoles.includes(currentRole)
        : false;

  const allowed =
    roleAllowed &&
    (!hasEntitlementPayload ||
      (hasAnyModule(snapshot, requiredModules) &&
        hasAnyFeature(snapshot, requiredFeatures)));

  if (loading) {
    return (
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Checking access for {pageTitle}...
          </p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen rounded-2xl border border-amber-200 bg-amber-50 px-5 py-7 dark:border-amber-800 dark:bg-amber-950/20 xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[720px] text-center">
          <h3 className="mb-3 font-semibold text-amber-800 text-theme-xl dark:text-amber-200 sm:text-2xl">
            Upgrade Required
          </h3>
          <p className="text-sm text-amber-800/90 dark:text-amber-200/90 sm:text-base">
            {deniedMessage ??
              `Your current plan does not include access to ${pageTitle}. Contact your admin to enable the required module or add-on.`}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
