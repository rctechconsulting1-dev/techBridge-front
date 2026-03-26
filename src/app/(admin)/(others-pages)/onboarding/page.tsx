"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import EntitlementGate from "@/components/common/EntitlementGate";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { useSidebar } from "@/context/SidebarContext";
import { apiClient } from "@/lib/api-client";
import {
  getPresetById,
  isBusinessPresetId,
  normalizePermissionFlags,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  PHASE8_PRESETS,
  type BusinessPresetId,
  type PresetPermissionKey,
} from "@/lib/onboarding-presets";

type ChecklistState = Record<string, boolean>;

type NextAction = {
  href: string;
  title: string;
  description: string;
};

type LaunchMode = "temporary_launch" | "final_domain";

export default function OnboardingPage() {
  const { selectedClient } = useSidebar();
  const selectedWebsiteId =
    Number(selectedClient?.website_id || selectedClient?.id || 0) || null;
  const recommendedLaunchMode: LaunchMode = selectedClient?.domain
    ? "final_domain"
    : "temporary_launch";
  const [savedLaunchMode, setSavedLaunchMode] = useState<LaunchMode | null>(null);

  const [presetId, setPresetId] = useState<BusinessPresetId>("home_services");
  const preset = useMemo(() => getPresetById(presetId), [presetId]);

  const [permissions, setPermissions] = useState<Record<PresetPermissionKey, boolean>>(
    preset.defaultPermissions,
  );
  const [checklist, setChecklist] = useState<ChecklistState>(() => {
    const next: ChecklistState = {};
    preset.launchChecklist.forEach((item) => {
      next[item.id] = false;
    });
    return next;
  });
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [permissionsMessage, setPermissionsMessage] = useState<string | null>(null);

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const checklistTotal = preset.launchChecklist.length;
  const progressPercent = checklistTotal
    ? Math.round((completedCount / checklistTotal) * 100)
    : 0;
  const nextActions = useMemo<NextAction[]>(() => {
    const actions: NextAction[] = [
      {
        href: "/site-settings",
        title: "1. Confirm global site settings",
        description: "Verify business identity, contact details, navigation, branding tokens, and tenant-wide configuration first.",
      },
      {
        href: "/built-in-pages",
        title: "2. Configure built-in pages",
        description: "Work through the built-in Home, Services, About, and Shop surfaces for this tenant.",
      },
    ];

    if (permissions.edit_branding) {
      actions.push({
        href: "/branding",
        title: "3. Apply branding",
        description: "Upload the logo, confirm brand colors, and align the tenant visual identity.",
      });
    }

    if (
      permissions.manage_integrations ||
      preset.recommendedModules.includes("google_business_management")
    ) {
      actions.push({
        href: "/google-business",
        title: `${actions.length + 1}. Connect Google Business`,
        description: "Link the listing and verify business details before traffic starts flowing.",
      });
    }

    if (
      permissions.manage_billing ||
      preset.recommendedModules.includes("ecommerce")
    ) {
      actions.push({
        href: "/billing",
        title: `${actions.length + 1}. Review billing setup`,
        description: "Confirm the tenant subscription, plan changes, and payment configuration.",
      });
    }

    if (preset.recommendedModules.includes("calendar_appointments")) {
      actions.push({
        href: "/calendar",
        title: `${actions.length + 1}. Validate booking availability`,
        description: "Check appointment scheduling, calendar behavior, and intake readiness.",
      });
    }

    return actions;
  }, [permissions.edit_branding, permissions.manage_billing, permissions.manage_integrations, preset]);

  const applyPreset = (id: BusinessPresetId) => {
    const nextPreset = getPresetById(id);
    setPresetId(id);
    setPermissions(nextPreset.defaultPermissions);

    const nextChecklist: ChecklistState = {};
    nextPreset.launchChecklist.forEach((item) => {
      nextChecklist[item.id] = false;
    });
    setChecklist(nextChecklist);
  };

  useEffect(() => {
    const loadPermissions = async () => {
      if (!selectedWebsiteId) {
        setPermissionsError(null);
        setPermissionsMessage(null);
        return;
      }

      setPermissionsLoading(true);
      setPermissionsError(null);

      try {
        const response = (await apiClient.get(
          `/content-permissions/${selectedWebsiteId}`,
          true,
        )) as {
          presetKey?: string | null;
          permissions?: Record<string, unknown>;
          source?: "persisted" | "default";
        };

        const resolvedPresetId = isBusinessPresetId(response?.presetKey)
          ? response.presetKey
          : presetId;
        if (resolvedPresetId !== presetId) {
          setPresetId(resolvedPresetId);
        }

        const fallback = getPresetById(resolvedPresetId).defaultPermissions;
        setPermissions(normalizePermissionFlags(response?.permissions, fallback));
        setPermissionsMessage(
          response?.source === "persisted"
            ? "Loaded persisted permissions profile."
            : "Using default permissions profile.",
        );
      } catch (error) {
        setPermissionsError(
          error instanceof Error
            ? error.message
            : "Failed to load tenant permissions profile.",
        );
      } finally {
        setPermissionsLoading(false);
      }
    };

    loadPermissions();
  }, [presetId, selectedWebsiteId]);

  useEffect(() => {
    const loadSavedLaunchMode = async () => {
      if (!selectedWebsiteId) {
        setSavedLaunchMode(null);
        return;
      }

      try {
        const response = (await apiClient.get(
          `/site-settings/${selectedWebsiteId}`,
          true,
        )) as { launch_mode?: string } | null;

        setSavedLaunchMode(
          response?.launch_mode === "final_domain"
            ? "final_domain"
            : response?.launch_mode === "temporary_launch"
              ? "temporary_launch"
              : null,
        );
      } catch {
        setSavedLaunchMode(null);
      }
    };

    loadSavedLaunchMode();
  }, [selectedWebsiteId]);

  const savePermissions = async () => {
    if (!selectedWebsiteId) {
      setPermissionsError("Select a client before saving permissions.");
      return;
    }

    setPermissionsSaving(true);
    setPermissionsError(null);
    setPermissionsMessage(null);

    try {
      const response = (await apiClient.put(
        `/content-permissions/${selectedWebsiteId}`,
        {
          presetKey: presetId,
          permissions,
        },
        true,
      )) as {
        permissions?: Record<string, unknown>;
      };

      setPermissions(
        normalizePermissionFlags(response?.permissions, getPresetById(presetId).defaultPermissions),
      );
      setPermissionsMessage("Permissions profile saved.");
    } catch (error) {
      setPermissionsError(
        error instanceof Error ? error.message : "Failed to save permissions profile.",
      );
    } finally {
      setPermissionsSaving(false);
    }
  };

  return (
    <EntitlementGate
      requiredRoles={["admin", "platform_admin"]}
      pageTitle="Tenant Onboarding"
    >
      <div>
        <PageBreadcrumb pageTitle="Tenant Onboarding" />
        <div className="space-y-6">
        <ComponentCard
          title="Tenant Context"
          desc="This Phase 8 console centralizes onboarding, permissions, support escalation, and launch verification."
        >
          {selectedClient ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/30">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Active tenant: {selectedClient?.name ?? "Untitled Tenant"}
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                website_id: {String(selectedClient?.website_id ?? "unknown")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/site-settings"
                  className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Global Site Settings
                </Link>
                <Link
                  href="/branding"
                  className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Branding
                </Link>
                <Link
                  href="/built-in-pages"
                  className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Built-in Pages
                </Link>
                <Link
                  href="/main-page"
                  className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Custom Pages
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Select a client in the sidebar to execute onboarding for a specific tenant.
            </p>
          )}
        </ComponentCard>

        <ComponentCard
          title="Launch Mode"
          desc="Choose the correct operating mode before you start domain and email work so the team does not over-promise what is live."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className={`rounded-xl border p-4 ${
                recommendedLaunchMode === "temporary_launch"
                  ? "border-[#CD7F32] bg-[#CD7F32]/10"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Temporary Launch
              </p>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                Use this when the client does not have a final domain yet. Launch on a stable RC-controlled subdomain and use a platform-owned verified sender temporarily.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <li>Website: stable RC subdomain, not a one-off preview URL</li>
                <li>Email: platform-owned sender domain</li>
                <li>Later: migrate to client domain and tenant-branded sender</li>
              </ul>
            </div>
            <div
              className={`rounded-xl border p-4 ${
                recommendedLaunchMode === "final_domain"
                  ? "border-[#CD7F32] bg-[#CD7F32]/10"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Final Domain Launch
              </p>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                Use this when the client already has a real website domain and you can complete Vercel domain setup plus Resend sender verification end to end.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <li>Website: final custom domain in Vercel</li>
                <li>Email: verified sending subdomain such as mg.clientdomain.com</li>
                <li>Go live only after real outbound email verification</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
            Recommended mode for current tenant: <strong>{recommendedLaunchMode === "temporary_launch" ? "Temporary Launch" : "Final Domain Launch"}</strong>
            {recommendedLaunchMode === "temporary_launch"
              ? " because no selected tenant domain is present yet."
              : " because a tenant domain is already present in the selected context."}
            <div className="mt-2">
              Saved mode in Global Site Settings: <strong>{savedLaunchMode === null ? "Not saved yet" : savedLaunchMode === "temporary_launch" ? "Temporary Launch" : "Final Domain Launch"}</strong>
            </div>
            <div className="mt-2">
              Reference runbook: docs/operations/TENANT_LIVE_TEST_RUNBOOK.md
            </div>
            <div className="mt-2">
              Authoritative control now lives in <Link href="/site-settings" className="font-medium text-[#8A541E] underline dark:text-[#f6c795]">Global Site Settings</Link> so the final-launch gate can be enforced server-side.
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Business Type Presets"
          desc="Apply a preset to preload recommended modules, content permissions, escalation ownership, and launch checklist defaults."
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {PHASE8_PRESETS.map((candidate) => {
              const isActive = candidate.id === presetId;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => applyPreset(candidate.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isActive
                      ? "border-[#CD7F32] bg-[#CD7F32]/10"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {candidate.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    {candidate.summary}
                  </p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Recommended modules: {candidate.recommendedModules.join(", ")}
                  </p>
                </button>
              );
            })}
          </div>
        </ComponentCard>

        <ComponentCard
          title="Controlled Content Editing Permissions"
          desc="Use this matrix to set what tenant-side editors can update without escalating to platform support."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-300">
              Website ID: {selectedWebsiteId ? String(selectedWebsiteId) : "not selected"}
            </p>
            <button
              type="button"
              onClick={savePermissions}
              disabled={!selectedWebsiteId || permissionsSaving || permissionsLoading}
              className="rounded-md bg-[#CD7F32] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {permissionsSaving ? "Saving..." : "Save Permissions"}
            </button>
          </div>

          {permissionsLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-300">Loading persisted permissions...</p>
          ) : null}
          {permissionsMessage ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-3 dark:border-green-900/60 dark:bg-green-950/20">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                {permissionsMessage}
              </p>
              {permissionsMessage === "Permissions profile saved." ? (
                <p className="mt-1 text-xs text-green-700/90 dark:text-green-300/90">
                  Next: move into the onboarding steps below and open the first recommended action.
                </p>
              ) : null}
            </div>
          ) : null}
          {permissionsError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{permissionsError}</p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {PERMISSION_KEYS.map((key) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
              >
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {PERMISSION_LABELS[key]}
                </span>
                <input
                  type="checkbox"
                  checked={permissions[key]}
                  onChange={(event) => {
                    const next = event.target.checked;
                    setPermissions((prev) => ({ ...prev, [key]: next }));
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-[#CD7F32] focus:ring-[#CD7F32]"
                />
              </label>
            ))}
          </div>

          <div className="rounded-xl border border-[#CD7F32]/30 bg-[#CD7F32]/5 p-4 dark:border-[#CD7F32]/40 dark:bg-[#CD7F32]/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Recommended next actions
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  After saving permissions, continue in this order so the tenant can move toward launch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const checklistSection = document.getElementById("tenant-launch-checklist");
                  checklistSection?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="rounded-md border border-[#CD7F32]/40 px-3 py-2 text-xs font-semibold text-[#8A541E] hover:bg-[#CD7F32]/10 dark:text-[#f6c795]"
              >
                Jump to Checklist
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {nextActions.map((action) => (
                <Link
                  key={`${action.href}-${action.title}`}
                  href={action.href}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-[#CD7F32] hover:bg-[#CD7F32]/5 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-[#CD7F32]"
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {action.title}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    {action.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Support Escalation Matrix"
          desc="Reference path for triage ownership and expected response windows per feature area."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-2 py-2">Module</th>
                  <th className="px-2 py-2">First-line Owner</th>
                  <th className="px-2 py-2">Escalation Path</th>
                  <th className="px-2 py-2">SLA Target</th>
                </tr>
              </thead>
              <tbody>
                {preset.escalationMatrix.map((entry) => (
                  <tr
                    key={`${entry.module}-${entry.firstLineOwner}`}
                    className="border-b border-gray-100 dark:border-gray-900"
                  >
                    <td className="px-2 py-2 font-medium text-gray-800 dark:text-gray-100">
                      {entry.module}
                    </td>
                    <td className="px-2 py-2 text-gray-600 dark:text-gray-300">
                      {entry.firstLineOwner}
                    </td>
                    <td className="px-2 py-2 text-gray-600 dark:text-gray-300">
                      {entry.escalationPath}
                    </td>
                    <td className="px-2 py-2 text-gray-600 dark:text-gray-300">
                      {entry.slaTarget}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Tenant Launch Checklist"
          desc="Track completion across domain, email, payments, content, and monitoring handoff before go-live."
        >
          <div id="tenant-launch-checklist" className="mb-3 flex items-center justify-between scroll-mt-24">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Progress: {completedCount}/{checklistTotal}
            </p>
            <span className="rounded-full bg-[#CD7F32]/15 px-2 py-1 text-xs font-semibold text-[#8A541E] dark:text-[#f6c795]">
              {progressPercent}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-2 rounded-full bg-[#CD7F32] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-4 space-y-2">
            {preset.launchChecklist.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
              >
                <input
                  type="checkbox"
                  checked={!!checklist[item.id]}
                  onChange={(event) => {
                    const next = event.target.checked;
                    setChecklist((prev) => ({ ...prev, [item.id]: next }));
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#CD7F32] focus:ring-[#CD7F32]"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">{item.label}</span>
              </label>
            ))}
          </div>
        </ComponentCard>
        </div>
      </div>
    </EntitlementGate>
  );
}
