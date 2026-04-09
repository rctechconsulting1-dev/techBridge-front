"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import EntitlementGate from "@/components/common/EntitlementGate";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { useSidebar } from "@/context/SidebarContext";
import { apiClient } from "@/lib/api-client";
import { getActiveTenantId } from "@/lib/auth-context";
import {
  CONTENT_PERMISSION_KEYS,
  CONTENT_PERMISSION_LABELS,
  DEFAULT_CONTENT_PERMISSION_FLAGS,
  normalizeContentPermissionFlags,
  type ContentPermissionKey,
} from "@/lib/content-permissions";
import {
  getQuestionLabelMap,
} from "@/lib/intake-questions";
import { buildLatestIntakeAdminPath } from "@/lib/intake-admin";
import { getApiBaseUrl } from "@/lib/api";
import type { BuiltInPageEditorRecord, BuiltInPageKey, SiteSettings } from "@/lib/cms-types";
import type { IntakeStoredSubmission } from "@/lib/intake-types";
import type { PaymentConfig } from "@/types/payments";

type ChecklistState = Record<string, boolean>;

type NextAction = {
  href: string;
  title: string;
  description: string;
};

type StepStatus = "not_started" | "seeded" | "reviewed" | "complete";

type OnboardingStep = {
  step: number;
  title: string;
  desc: string;
  href: string | null;
  status: StepStatus;
  current: boolean;
};

type LaunchMode = "temporary_launch" | "final_domain";
type DomainStatusRecord = {
  domain: string;
  status: string;
  isPrimary: boolean;
  vercelVerified?: boolean;
};
type EmailProfileStatus = {
  available: boolean;
  fromEmail: string;
  sendingDomain: string;
  dkimVerified: boolean;
  spfVerified: boolean;
  emailMode: "platform_sender" | "tenant_branded";
};

const ONBOARDING_CHECKLIST_ITEMS = [
  { id: "intake", label: "Review latest intake submission and stage only the usable launch-one details" },
  { id: "permissions", label: "Confirm tenant editing permissions if the client will edit content directly" },
  { id: "site", label: "Save global site settings for launch one: identity, phone, service area, core nav, and launch mode" },
  { id: "pages", label: "Review the core site paths: Home, Services, About, and Contact" },
  { id: "branding", label: "Apply a usable logo, basic brand tokens, and visual QA" },
  { id: "domain-email", label: "Finish domain and branded sender setup only if this tenant is moving to final-domain launch now" },
  { id: "payments", label: "Review payments or booking only if this tenant actually needs them for client one" },
  { id: "handoff", label: "Run launch QA, test the lead path, and explicitly sign off the tenant" },
] as const;

const LAUNCH_ONE_CHECKLIST_IDS = ["intake", "site", "pages", "branding", "handoff"] as const;

const LATER_PHASE_CHECKLIST_IDS = ["permissions", "domain-email", "payments"] as const;

const UNIVERSAL_SUPPORT_AREAS = [
  {
    area: "Site content and structure",
    owner: "Platform Admin",
    path: "Onboarding -> Built-in Pages / Managed Pages / Custom Pages",
    target: "Same business day",
  },
  {
    area: "Branding and assets",
    owner: "Platform Admin",
    path: "Onboarding -> Branding / Assets",
    target: "Same business day",
  },
  {
    area: "Domains and email delivery",
    owner: "Platform Admin",
    path: "Site Settings -> Domains / Email Delivery",
    target: "4 business hours",
  },
  {
    area: "Payments and reservations",
    owner: "Platform Admin",
    path: "Payment Config -> Backend verification if needed",
    target: "4 business hours",
  },
];

const OPERATOR_SEQUENCE = [
  {
    title: "Create the tenant and provision the default site structure",
    detail:
      "Tenant creation seeds the website, nav scaffolding, payment config defaults, and owner emails. This is provisioning, not launch completion.",
  },
  {
    title: "Wait for intake submission, then review it",
    detail:
      "Intake answers and uploaded files are stored for admin review. They do not auto-publish into the live site.",
  },
  {
    title: "Apply intake into Global Site Settings and Branding",
    detail:
      "Stage business identity, contact data, logo, maps URL, social links, launch mode, and nav choices into the tenant configuration.",
  },
  {
    title: "Configure built-in pages, managed pages, and any optional system pages",
    detail:
      "Treat the page set as seeded until a human reviews Home, Services, About, Shop when relevant, and optional routes such as FAQ, Reviews, Locations, Blog, Menu, or Reservations.",
  },
  {
    title: "Review payments only when the tenant actually uses them",
    detail:
      "A seeded payment config row should not count as done. Deposits, checkout, reservations, and Stripe readiness still need operator review.",
  },
  {
    title: "Complete domain and email only for final-domain launches",
    detail:
      "Temporary launch means this area is intentionally deferred. Final launch requires verified domain and branded sender readiness.",
  },
  {
    title: "Run final QA and mark handoff complete",
    detail:
      "Use the checklist as the final operator sign-off after each prior area has been reviewed.",
  },
] as const;

const LAUNCH_ONE_NOW = [
  "Get the tenant onto a credible temporary-launch site before chasing every optional feature.",
  "Treat Global Site Settings as business identity and conversion-foundation setup, not a dumping ground for every future control.",
  "Review only the core pages and lead path needed to rank, convert, and operate cleanly for client one.",
] as const;

const LAUNCH_ONE_LATER = [
  "Permissions, domain/email hardening, and payment setup are conditional follow-up work unless they are truly required for this client now.",
  "Optional system pages like FAQ, Reviews, Locations, Blog, Menu, or Reservations should not delay the first launch unless the strategy requires them.",
  "Do not let seeded defaults or speculative future features count as launch progress.",
] as const;

const STEP_STATUS_META: Record<
  StepStatus,
  {
    label: string;
    containerClassName: string;
    badgeClassName: string;
    markerClassName: string;
    textClassName: string;
  }
> = {
  not_started: {
    label: "Not started",
    containerClassName: "border-gray-200 dark:border-gray-800",
    badgeClassName: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
    markerClassName: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    textClassName: "text-gray-900 dark:text-white",
  },
  seeded: {
    label: "Seeded",
    containerClassName: "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20",
    badgeClassName: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    markerClassName: "bg-amber-500 text-white",
    textClassName: "text-amber-900 dark:text-amber-100",
  },
  reviewed: {
    label: "Reviewed",
    containerClassName: "border-sky-200 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-950/20",
    badgeClassName: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
    markerClassName: "bg-sky-600 text-white",
    textClassName: "text-sky-900 dark:text-sky-100",
  },
  complete: {
    label: "Complete",
    containerClassName: "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20",
    badgeClassName: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    markerClassName: "bg-green-600 text-white",
    textClassName: "text-green-700 dark:text-green-300",
  },
};

const hasMeaningfulSiteSettings = (siteSettings: SiteSettings | null) => {
  if (!siteSettings) {
    return false;
  }

  return Boolean(
    siteSettings.contact_email ||
      siteSettings.contact_phone ||
      siteSettings.address ||
      siteSettings.logo_url ||
      siteSettings.google_maps_url ||
      siteSettings.footer_tagline ||
      siteSettings.font_family ||
      siteSettings.font_url ||
      (siteSettings.header_nav_links?.length ?? 0) > 0 ||
      (siteSettings.footer_nav_links?.length ?? 0) > 0,
  );
};

const navLinksContainHref = (
  links: SiteSettings["header_nav_links"] | SiteSettings["footer_nav_links"] | null | undefined,
  href: string,
) => {
  return (links ?? []).some((link) => link?.href?.trim().toLowerCase() === href);
};

const hasLaunchOneSiteSettings = (siteSettings: SiteSettings | null) => {
  if (!siteSettings) {
    return false;
  }

  const hasContactMethod = Boolean(siteSettings.contact_phone || siteSettings.contact_email);
  const hasServiceArea = Boolean(siteSettings.address);
  const hasCoreNav =
    navLinksContainHref(siteSettings.header_nav_links, "/") &&
    navLinksContainHref(siteSettings.header_nav_links, "/services") &&
    navLinksContainHref(siteSettings.header_nav_links, "/about");
  const hasContactPath =
    navLinksContainHref(siteSettings.header_nav_links, "/contact") ||
    navLinksContainHref(siteSettings.footer_nav_links, "/contact");

  return hasContactMethod && hasServiceArea && hasCoreNav && hasContactPath;
};

const hasVerifiedPrimaryCustomDomain = (domainStatusRecords: DomainStatusRecord[]) => {
  return domainStatusRecords.some((record) => {
    const isTemporaryRcDomain = record.domain.endsWith(".rctechbridge.com");
    return (
      record.isPrimary &&
      !isTemporaryRcDomain &&
      (record.status === "verified" || record.status === "active" || record.vercelVerified)
    );
  });
};

const hasVerifiedTenantEmailProfile = (emailProfileStatus: EmailProfileStatus | null) => {
  return Boolean(
    emailProfileStatus?.available &&
      emailProfileStatus.emailMode === "tenant_branded" &&
      emailProfileStatus.fromEmail &&
      emailProfileStatus.sendingDomain &&
      emailProfileStatus.dkimVerified,
  );
};

export default function OnboardingPage() {
  const { selectedClient } = useSidebar();
  const selectedTenantId =
    Number(selectedClient?.tenant_id || getActiveTenantId() || 0) || null;
  const selectedWebsiteId =
    Number(selectedClient?.website_id || 0) || null;
  const recommendedLaunchMode: LaunchMode =
    selectedClient?.domain && !selectedClient?.temporaryDomainAssigned
      ? "final_domain"
      : "temporary_launch";
  const [savedLaunchMode, setSavedLaunchMode] = useState<LaunchMode | null>(null);

  const [permissions, setPermissions] = useState<Record<ContentPermissionKey, boolean>>(
    DEFAULT_CONTENT_PERMISSION_FLAGS,
  );
  const [checklist, setChecklist] = useState<ChecklistState>(() => {
    const next: ChecklistState = {};
    ONBOARDING_CHECKLIST_ITEMS.forEach((item) => {
      next[item.id] = false;
    });
    return next;
  });
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [permissionsMessage, setPermissionsMessage] = useState<string | null>(null);
  const [hasPersistedPermissions, setHasPersistedPermissions] = useState(false);
  const [siteSettingsSnapshot, setSiteSettingsSnapshot] = useState<SiteSettings | null>(null);
  const [domainStatusRecords, setDomainStatusRecords] = useState<DomainStatusRecord[]>([]);
  const [emailProfileStatus, setEmailProfileStatus] =
    useState<EmailProfileStatus | null>(null);
  const [intakeSubmission, setIntakeSubmission] =
    useState<IntakeStoredSubmission | null>(null);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [builtInPagesComplete, setBuiltInPagesComplete] = useState(false);
  const [paymentConfigSnapshot, setPaymentConfigSnapshot] = useState<PaymentConfig | null>(null);

  const intakeQuestionLabels = useMemo(
    () =>
      intakeSubmission
        ? getQuestionLabelMap(intakeSubmission.businessType ?? "universal")
        : {},
    [intakeSubmission],
  );

  const launchOneChecklistItems = ONBOARDING_CHECKLIST_ITEMS.filter((item) =>
    LAUNCH_ONE_CHECKLIST_IDS.includes(item.id as (typeof LAUNCH_ONE_CHECKLIST_IDS)[number]),
  );
  const laterPhaseChecklistItems = ONBOARDING_CHECKLIST_ITEMS.filter((item) =>
    LATER_PHASE_CHECKLIST_IDS.includes(item.id as (typeof LATER_PHASE_CHECKLIST_IDS)[number]),
  );
  const completedCount = launchOneChecklistItems.filter((item) => checklist[item.id]).length;
  const checklistTotal = launchOneChecklistItems.length;
  const progressPercent = checklistTotal
    ? Math.round((completedCount / checklistTotal) * 100)
    : 0;
  const globalSiteSettingsSeeded = Boolean(siteSettingsSnapshot);
  const globalSiteSettingsReviewed = useMemo(() => {
    if (!siteSettingsSnapshot) {
      return false;
    }

    return hasLaunchOneSiteSettings(siteSettingsSnapshot) && Boolean(savedLaunchMode);
  }, [savedLaunchMode, siteSettingsSnapshot]);
  const brandingComplete = useMemo(
    () => Boolean(siteSettingsSnapshot?.logo_url),
    [siteSettingsSnapshot],
  );
  const domainEmailReviewed = useMemo(() => {
    if (savedLaunchMode === "temporary_launch") {
      return true;
    }

    if (!savedLaunchMode) {
      return false;
    }

    return (
      hasVerifiedPrimaryCustomDomain(domainStatusRecords) &&
      hasVerifiedTenantEmailProfile(emailProfileStatus)
    );
  }, [domainStatusRecords, emailProfileStatus, savedLaunchMode]);
  const paymentsRelevant = Boolean(
    siteSettingsSnapshot?.ecommerce_enabled ||
      paymentConfigSnapshot?.reservations_enabled ||
      paymentConfigSnapshot?.ecommerce_checkout_enabled,
  );
  const paymentConfigSeeded = paymentConfigSnapshot?._persisted === true;
  const paymentConfigReviewed = !paymentsRelevant
    ? Boolean(siteSettingsSnapshot)
    : Boolean(
        paymentConfigSnapshot?._persisted &&
          paymentConfigSnapshot.updated_at &&
          paymentConfigSnapshot.created_at &&
          paymentConfigSnapshot.updated_at !== paymentConfigSnapshot.created_at,
      );

  const onboardingSteps = useMemo<OnboardingStep[]>(() => {
    const pageStructureSeeded = Boolean(
      (siteSettingsSnapshot?.header_nav_links?.length ?? 0) > 0 ||
        (siteSettingsSnapshot?.footer_nav_links?.length ?? 0) > 0 ||
        selectedWebsiteId,
    );
    const domainEmailSeeded = Boolean(
      savedLaunchMode === "temporary_launch" ||
        domainStatusRecords.length > 0 ||
        emailProfileStatus,
    );

    const base: Array<Omit<OnboardingStep, "step" | "current">> = [
      {
        title: "Review Intake",
        desc: "Intake submission creates reviewable source material. It is only complete after you review it and check it off below.",
        href: "#latest-intake-submission",
        status: checklist.intake
          ? "complete"
          : intakeSubmission
            ? "seeded"
            : "not_started",
      },
      {
        title: "Confirm Editing Permissions",
        desc: "Permissions are reviewed when a persisted tenant profile exists. Mark complete after you confirm the matrix is correct.",
        href: "#editing-permissions",
        status: checklist.permissions
          ? "complete"
          : hasPersistedPermissions
            ? "reviewed"
            : "not_started",
      },
      {
        title: "Global Site Settings",
        desc: "Seeded data does not count as done. Review identity, contact info, navigation, and launch mode before marking complete.",
        href: "/site-settings",
        status: checklist.site
          ? "complete"
          : globalSiteSettingsReviewed
            ? "reviewed"
            : globalSiteSettingsSeeded
              ? "seeded"
              : "not_started",
      },
      {
        title: "Built-in Pages",
        desc: "Provisioned pages are only seeded. Review Home, Services, About, Shop when relevant, and related managed pages before marking complete.",
        href: "/built-in-pages",
        status: checklist.pages
          ? "complete"
          : builtInPagesComplete
            ? "reviewed"
            : pageStructureSeeded
              ? "seeded"
              : "not_started",
      },
      {
        title: "Branding",
        desc: "A logo or prefilled assets mean branding is staged. Mark complete only after visual QA is done.",
        href: "/branding",
        status: checklist.branding
          ? "complete"
          : brandingComplete
            ? "reviewed"
            : intakeSubmission?.files.some((file) => file.questionId === "logo")
              ? "seeded"
              : "not_started",
      },
      {
        title: savedLaunchMode === "temporary_launch" ? "Domain & Email Later" : "Domain & Email",
        desc:
          savedLaunchMode === "temporary_launch"
            ? "Temporary launch is selected, so this area is deferred operationally. Mark complete only if you have explicitly reviewed that deferral."
            : "For final launch, complete DNS, domain verification, and branded sender setup before marking this done.",
        href: "/site-settings",
        status: checklist["domain-email"]
          ? "complete"
          : domainEmailReviewed
            ? "reviewed"
            : domainEmailSeeded
              ? "seeded"
              : "not_started",
      },
      {
        title: "Payments & Booking Setup",
        desc: paymentsRelevant
          ? "A seeded payment config row is not final. Review checkout, deposits, reservations, and Stripe readiness before marking complete."
          : "Not required for this tenant right now, but still mark complete only after you confirm it is intentionally not needed.",
        href: "/payment-config",
        status: checklist.payments
          ? "complete"
          : paymentConfigReviewed
            ? "reviewed"
            : paymentConfigSeeded || !paymentsRelevant
              ? "seeded"
              : "not_started",
      },
      {
        title: "Final QA & Handoff",
        desc: "This should remain incomplete until the prior areas have been reviewed and you explicitly sign off the tenant.",
        href: "#launch-checklist",
        status: checklist.handoff ? "complete" : "not_started",
      },
    ];

    const firstIncompleteIndex = base.findIndex((step) => step.status !== "complete");

    return base.map((step, index) => ({
      ...step,
      step: index + 1,
      current: firstIncompleteIndex !== -1 && index === firstIncompleteIndex,
    }));
  }, [
    brandingComplete,
    builtInPagesComplete,
    checklist,
    domainEmailReviewed,
    domainStatusRecords,
    emailProfileStatus,
    globalSiteSettingsReviewed,
    globalSiteSettingsSeeded,
    hasPersistedPermissions,
    intakeSubmission,
    paymentConfigReviewed,
    paymentConfigSeeded,
    paymentsRelevant,
    savedLaunchMode,
    selectedWebsiteId,
    siteSettingsSnapshot,
  ]);

  const nextActions = useMemo<NextAction[]>(() => {
    const actions: NextAction[] = [
      {
        href: "/site-settings",
        title: "1. Stage intake into site settings",
        description: "Apply the latest intake, then save business identity, contact details, core navigation, brand tokens, and launch mode.",
      },
      {
        href: "/built-in-pages",
        title: "2. Review core pages",
        description: "Work through Home, Services, and About, then verify the Contact path. Treat seeded page scaffolding as a starting point, not completion.",
      },
      {
        href: "/branding",
        title: "3. Apply branding",
        description: "Use the intake logo or a temporary fallback, confirm colors, and complete basic visual QA.",
      },
      {
        href: "/site-settings",
        title: "4. Run launch QA",
        description: "Confirm temporary-launch intent, test the lead path, and only then treat the tenant as ready for client one.",
      },
    ];

    return actions;
  }, []);

  useEffect(() => {
    const loadPermissions = async () => {
      if (!selectedWebsiteId) {
        setPermissionsError(null);
        setPermissionsMessage(null);
        setHasPersistedPermissions(false);
        return;
      }

      setPermissionsLoading(true);
      setPermissionsError(null);

      try {
        const response = (await apiClient.get(
          `/content-permissions/${selectedWebsiteId}`,
          true,
        )) as {
          permissions?: Record<string, unknown>;
          source?: "persisted" | "default";
        };

        setPermissions(
          normalizeContentPermissionFlags(response?.permissions, DEFAULT_CONTENT_PERMISSION_FLAGS),
        );
        setHasPersistedPermissions(response?.source === "persisted");
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
  }, [selectedWebsiteId]);

  useEffect(() => {
    const loadBuiltInPageStatus = async () => {
      if (!selectedWebsiteId) {
        setBuiltInPagesComplete(false);
        return;
      }

      const token = apiClient.getToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(selectedTenantId ? { "x-tenant-id": String(selectedTenantId) } : {}),
      };
      const requiredPageKeys: BuiltInPageKey[] = ["home", "services", "about"];
      if (siteSettingsSnapshot?.ecommerce_enabled) {
        requiredPageKeys.push("shop");
      }

      try {
        const results = await Promise.all(
          requiredPageKeys.map(async (pageKey) => {
            const response = await fetch(
              `${getApiBaseUrl()}/built-in-page-content/editor/${pageKey}?website_id=${selectedWebsiteId}`,
              {
                headers,
                cache: "no-store",
              },
            );

            if (!response.ok) {
              return false;
            }

            const payload = (await response.json()) as BuiltInPageEditorRecord<BuiltInPageKey>;
            return payload.source === "persisted" && Boolean(payload.updated_at || payload.workflow?.published_at);
          }),
        );

        setBuiltInPagesComplete(results.every(Boolean));
      } catch {
        setBuiltInPagesComplete(false);
      }
    };

    void loadBuiltInPageStatus();
  }, [selectedTenantId, selectedWebsiteId, siteSettingsSnapshot?.ecommerce_enabled]);

  useEffect(() => {
    const loadPaymentConfig = async () => {
      if (!selectedTenantId) {
        setPaymentConfigSnapshot(null);
        return;
      }

      const token = apiClient.getToken();
      try {
        const response = await fetch(`${getApiBaseUrl()}/payment-config`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "x-tenant-id": String(selectedTenantId),
          },
          cache: "no-store",
        });

        if (!response.ok) {
          setPaymentConfigSnapshot(null);
          return;
        }

        const payload = (await response.json()) as PaymentConfig;
        setPaymentConfigSnapshot(payload);
      } catch {
        setPaymentConfigSnapshot(null);
      }
    };

    void loadPaymentConfig();
  }, [selectedTenantId]);

  useEffect(() => {
    const loadSiteSettings = async () => {
      if (!selectedWebsiteId) {
        setSavedLaunchMode(null);
        setSiteSettingsSnapshot(null);
        return;
      }

      try {
        const response = (await apiClient.get(
          `/site-settings/${selectedWebsiteId}`,
          true,
        )) as SiteSettings | null;

        setSiteSettingsSnapshot(response);

        setSavedLaunchMode(
          response?.launch_mode === "final_domain"
            ? "final_domain"
            : response?.launch_mode === "temporary_launch"
              ? "temporary_launch"
              : null,
        );
      } catch {
        setSavedLaunchMode(null);
        setSiteSettingsSnapshot(null);
      }
    };

    void loadSiteSettings();
  }, [selectedWebsiteId]);

  useEffect(() => {
    const loadLatestIntake = async () => {
      const requestPath = buildLatestIntakeAdminPath({
        websiteId: selectedWebsiteId,
        tenantId: selectedTenantId,
      });

      if (!requestPath) {
        setIntakeSubmission(null);
        setIntakeError(null);
        return;
      }

      setIntakeLoading(true);
      setIntakeError(null);

      try {
        const token = apiClient.getToken();
        const response = await fetch(requestPath, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });

        if (response.status === 404) {
          setIntakeSubmission(null);
          return;
        }

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `Failed to load intake (${response.status})`);
        }

        const data = (await response.json()) as IntakeStoredSubmission;
        setIntakeSubmission(data);
      } catch (error) {
        setIntakeError(
          error instanceof Error
            ? error.message
            : "Failed to load latest intake submission.",
        );
      } finally {
        setIntakeLoading(false);
      }
    };

    void loadLatestIntake();
  }, [selectedTenantId, selectedWebsiteId]);

  useEffect(() => {
    const loadDomainAndEmailStatus = async () => {
      if (!selectedWebsiteId) {
        setDomainStatusRecords([]);
        setEmailProfileStatus(null);
        return;
      }

      const token = apiClient.getToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(selectedTenantId ? { "x-tenant-id": String(selectedTenantId) } : {}),
      };

      const [domainsResponse, emailResponse] = await Promise.allSettled([
        fetch(`/api/domains/status?websiteId=${encodeURIComponent(String(selectedWebsiteId))}`, {
          headers,
          cache: "no-store",
        }),
        fetch(`/api/email/profile/status?websiteId=${encodeURIComponent(String(selectedWebsiteId))}`, {
          headers,
          cache: "no-store",
        }),
      ]);

      if (domainsResponse.status === "fulfilled" && domainsResponse.value.ok) {
        const payload = (await domainsResponse.value.json()) as {
          domains?: DomainStatusRecord[];
        };
        setDomainStatusRecords(Array.isArray(payload.domains) ? payload.domains : []);
      } else {
        setDomainStatusRecords([]);
      }

      if (emailResponse.status === "fulfilled" && emailResponse.value.ok) {
        const payload = (await emailResponse.value.json()) as {
          profile?: Partial<EmailProfileStatus>;
        };
        setEmailProfileStatus(
          payload.profile
            ? {
                available: payload.profile.available !== false,
                fromEmail: payload.profile.fromEmail || "",
                sendingDomain: payload.profile.sendingDomain || "",
                dkimVerified: Boolean(payload.profile.dkimVerified),
                spfVerified: Boolean(payload.profile.spfVerified),
                emailMode:
                  payload.profile.emailMode === "tenant_branded"
                    ? "tenant_branded"
                    : "platform_sender",
              }
            : null,
        );
      } else {
        setEmailProfileStatus(null);
      }
    };

    void loadDomainAndEmailStatus();
  }, [selectedTenantId, selectedWebsiteId]);

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
          permissions,
        },
        true,
      )) as {
        permissions?: Record<string, unknown>;
      };

      setPermissions(
        normalizeContentPermissionFlags(response?.permissions, DEFAULT_CONTENT_PERMISSION_FLAGS),
      );
      setHasPersistedPermissions(true);
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
          desc="This console centralizes intake review, permissions, launch readiness, and operational handoff for a tenant."
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
                  href="/managed-pages"
                  className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Managed Pages
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

        {/* ── Onboarding Steps Wizard ── */}
        <ComponentCard
          title="Onboarding Steps"
          desc="Follow this operator sequence. Step status now distinguishes seeded defaults from reviewed work and explicit sign-off."
        >
          <div className="mb-4 rounded-xl border border-[#CD7F32]/30 bg-[#CD7F32]/5 p-4 dark:border-[#CD7F32]/40 dark:bg-[#CD7F32]/10">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Status meaning
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {(["not_started", "seeded", "reviewed", "complete"] as StepStatus[]).map((statusKey) => (
                <span
                  key={statusKey}
                  className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium ${STEP_STATUS_META[statusKey].badgeClassName}`}
                >
                  {STEP_STATUS_META[statusKey].label}
                </span>
              ))}
            </div>
            <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
              <p>Not started: no meaningful operator work has happened yet.</p>
              <p>Seeded: the system provisioned defaults or captured intake, but a human has not finished reviewing it.</p>
              <p>Reviewed: the configuration appears substantively reviewed, but it is not signed off as complete.</p>
              <p>Complete: you explicitly checked the corresponding launch item off below.</p>
            </div>
          </div>

          <ol className="flex flex-col gap-3">
            {onboardingSteps.map(({ step, title, desc, href, current, status }) => (
              <li key={step} className={`flex gap-4 rounded-xl border px-4 py-3 ${STEP_STATUS_META[status].containerClassName} ${current && status !== "complete" ? "ring-1 ring-[#CD7F32]/50" : ""}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${STEP_STATUS_META[status].markerClassName}`}>
                  {status === "complete" ? "✓" : step}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-semibold ${current && status !== "complete" ? "text-[#8A541E] dark:text-[#f6c795]" : STEP_STATUS_META[status].textClassName}`}>
                    {title}
                    </p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STEP_STATUS_META[status].badgeClassName}`}>
                      {STEP_STATUS_META[status].label}
                    </span>
                    {current && status !== "complete" ? (
                      <span className="text-xs font-normal text-[#CD7F32]">← You are here</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
                {href && (
                  <Link href={href} className="shrink-0 self-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                    Go →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </ComponentCard>

        <ComponentCard
          title="Launch-One Scope"
          desc="Use this lens to keep the first tenant moving. Anything outside this scope should be treated as later, conditional, or not applicable."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-950/20">
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                Do Now
              </p>
              <div className="mt-3 space-y-2 text-xs text-gray-700 dark:text-gray-200">
                {LAUNCH_ONE_NOW.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Later Or Conditional
              </p>
              <div className="mt-3 space-y-2 text-xs text-gray-700 dark:text-gray-200">
                {LAUNCH_ONE_LATER.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Operator Sequence"
          desc="Use this order during onboarding so intake, configuration, pages, payments, and launch checks happen in the right sequence."
        >
          <ol className="space-y-3">
            {OPERATOR_SEQUENCE.map((item, index) => (
              <li key={item.title} className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {index + 1}. {item.title}
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  {item.detail}
                </p>
              </li>
            ))}
          </ol>
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
          title="Latest Intake Submission"
          desc="Review the tenant's questionnaire answers here first. Intake does not auto-publish; it must be staged into Site Settings or Branding by an operator."
        >
          <div id="latest-intake-submission" className="scroll-mt-24" />
          {!selectedWebsiteId ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Select a tenant first to load intake answers.
            </p>
          ) : intakeLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Loading latest intake submission...
            </p>
          ) : intakeError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {intakeError}
            </p>
          ) : !intakeSubmission ? (
            <p className="text-sm text-gray-500 dark:text-gray-300">
              No intake questionnaire has been submitted for this tenant yet.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/30">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Submitted by {intakeSubmission.email}
                    </p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      Universal Website Intake
                      {" · "}
                      {new Date(intakeSubmission.submittedAt).toLocaleString()}
                    </p>
                    {intakeSubmission.adminEditedAt ? (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        Admin-edited
                        {intakeSubmission.adminEditedByName || intakeSubmission.adminEditedByEmail
                          ? ` by ${intakeSubmission.adminEditedByName ?? intakeSubmission.adminEditedByEmail}`
                          : ""}
                        {" · "}
                        {new Date(intakeSubmission.adminEditedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/site-settings?prefillFromIntake=1"
                      className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Apply to Site Settings
                    </Link>
                    <Link
                      href="/branding?prefillFromIntake=1"
                      className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Apply to Branding
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Answers
                  </p>
                  <dl className="mt-3 space-y-3 text-sm">
                    {Object.entries(intakeSubmission.answers)
                      .filter(([, value]) => value !== null && value !== "")
                      .map(([key, value]) => (
                        <div key={key} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 dark:border-gray-800">
                          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {intakeQuestionLabels[key] ?? key.replace(/_/g, " ")}
                          </dt>
                          <dd className="mt-1 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                            {Array.isArray(value) ? value.join(", ") : String(value)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Uploaded Files
                  </p>
                  {intakeSubmission.files.length ? (
                    <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      {intakeSubmission.files.map((file) => (
                        <li key={`${file.questionId}-${file.url}`}>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#8A541E] underline dark:text-[#f6c795]"
                          >
                            {file.filename}
                          </a>
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            {intakeQuestionLabels[file.questionId] ?? file.category ?? "file"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-300">
                      No files were uploaded.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </ComponentCard>

        <ComponentCard
          title="Controlled Content Editing Permissions"
          desc="Use this matrix to define what tenant-side editors can update without escalating to platform support. This becomes reviewed when saved, and complete when you confirm it in the checklist."
        >
          <div id="editing-permissions" className="scroll-mt-24" />
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
            {CONTENT_PERMISSION_KEYS.map((key) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
              >
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {CONTENT_PERMISSION_LABELS[key]}
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
          title="Operational Coverage"
          desc="Reference the main support areas and the expected first-line operating path for this tenant workflow."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-2 py-2">Area</th>
                  <th className="px-2 py-2">Owner</th>
                  <th className="px-2 py-2">Working Path</th>
                  <th className="px-2 py-2">Response Target</th>
                </tr>
              </thead>
              <tbody>
                {UNIVERSAL_SUPPORT_AREAS.map((entry) => (
                  <tr
                    key={`${entry.area}-${entry.owner}`}
                    className="border-b border-gray-100 dark:border-gray-900"
                  >
                    <td className="px-2 py-2 font-medium text-gray-800 dark:text-gray-100">
                      {entry.area}
                    </td>
                    <td className="px-2 py-2 text-gray-600 dark:text-gray-300">
                      {entry.owner}
                    </td>
                    <td className="px-2 py-2 text-gray-600 dark:text-gray-300">
                      {entry.path}
                    </td>
                    <td className="px-2 py-2 text-gray-600 dark:text-gray-300">
                      {entry.target}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Launch-One Checklist"
          desc="Use this for strict first-client sign-off. Only the items that actually unblock launch count toward progress here."
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
            {launchOneChecklistItems.map((item) => (
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
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Later / Conditional Areas
            </p>
            <p className="mt-1 text-xs text-gray-700 dark:text-gray-200">
              Track these separately so they stop muddying launch-one progress.
            </p>
            <div className="mt-3 space-y-2">
              {laterPhaseChecklistItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2 dark:border-amber-900/40 dark:bg-gray-900/40"
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
          </div>
        </ComponentCard>
        </div>
      </div>
    </EntitlementGate>
  );
}
