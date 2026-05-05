"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { useSidebar } from "@/context/SidebarContext";
import { apiClient } from "@/lib/api-client";
import { setActiveTenantId } from "@/lib/auth-context";
import {
  OPTIONAL_SYSTEM_PAGE_CONFIGS,
  type OptionalSystemPageSlug,
} from "@/lib/page-management";

const MODULE_OPTIONS = [
  { value: "website_core", label: "Website Core" },
  { value: "seo_content", label: "SEO Content" },
  { value: "lead_capture", label: "Lead Capture" },
  { value: "calendar_appointments", label: "Calendar / Appointments" },
  { value: "google_business_management", label: "Google Business" },
  { value: "sms_leads_and_comms", label: "SMS Leads and Comms" },
  { value: "google_ads_optimization", label: "Google Ads Optimization" },
  { value: "custom_ai_agent", label: "Custom AI Agent" },
];

const PLAN_OPTIONS = [
  { value: "starter", label: "Starter ($99/mo)" },
  { value: "professional", label: "Professional ($299/mo)" },
  { value: "business", label: "Business ($599/mo)" },
  { value: "enterprise", label: "Enterprise (Custom)" },
];

const OPTIONAL_TENANT_PAGE_OPTIONS = OPTIONAL_SYSTEM_PAGE_CONFIGS.filter(
  (config) => config.slug !== "contact" && config.slug !== "reservations",
);

const CORE_PAGE_LABELS = ["Home", "Services", "About", "Contact"];

type TenantFeatureToggleKey = "shop" | "reservations";

type TenantFeatureToggles = Record<TenantFeatureToggleKey, boolean>;

const initialFeatureToggles: TenantFeatureToggles = {
  shop: false,
  reservations: false,
};

type FormState = {
  tenantName: string;
  tenantSlug: string;
  timezone: string;
  defaultCurrency: string;
  domain: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerPhone: string;
  planKey: string;
};

type ProvisionResponse = {
  tenant: {
    id: number;
    name: string;
    slug: string;
  };
  website: {
    id: number;
    domain: string | null;
  };
  ownerUser: {
    id: number;
    email: string;
    role: string;
  };
  enabledModules: string[];
  enabledFeatures: string[];
  temporaryDomainAssigned?: boolean;
};

type TenantListItem = {
  id: number;
  slug: string;
  name: string;
  business_type: string;
  status: string;
  default_currency: string;
  timezone: string;
  created_at: string;
  seat_limit: number | null;
  seat_used: number;
  plan_key: string | null;
  billing_grace_expires_at: string | null;
  website_id: number | null;
  website_domain: string | null;
  primary_domain: string | null;
  primary_domain_status: string | null;
  owner_user_id: number | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_role: string | null;
  owner_phone: string | null;
  invite_status: "not_sent" | "sent" | "partial_failure" | "failed" | null;
  invite_attempt_count: number | null;
  last_attempted_at: string | null;
  last_sent_at: string | null;
  last_error: string | null;
  delivery_results: Record<string, {
    status: "accepted" | "failed" | "skipped";
    providerId: string | null;
    message: string | null;
    at: string | null;
  }> | null;
  enabled_modules: string[];
};

type InviteEmailKey = "welcome" | "reset_password" | "intake";

type InviteDeliveryResultRecord = NonNullable<TenantListItem["delivery_results"]>;

type InviteDeliveryResult = {
  status: "accepted" | "failed" | "skipped";
  providerId?: string | null;
  message?: string | null;
  at: string;
};

type EditFormState = {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  timezone: string;
  defaultCurrency: string;
  domain: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
};

const initialState: FormState = {
  tenantName: "",
  tenantSlug: "",
  timezone: "America/Chicago",
  defaultCurrency: "USD",
  domain: "",
  ownerName: "",
  ownerEmail: "",
  ownerPassword: "",
  ownerPhone: "",
  planKey: "starter",
};

export default function TenantsPage() {
  const router = useRouter();
  const { setSelectedClient } = useSidebar();
  const [form, setForm] = useState<FormState>(initialState);
  const [selectedAdditionalPages, setSelectedAdditionalPages] = useState<OptionalSystemPageSlug[]>([]);
  const [featureToggles, setFeatureToggles] = useState<TenantFeatureToggles>(initialFeatureToggles);
  const [enabledModules, setEnabledModules] = useState<string[]>([
    "website_core",
    "seo_content",
    "lead_capture",
  ]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editModules, setEditModules] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inviteFilter, setInviteFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [rowActionTenantId, setRowActionTenantId] = useState<number | null>(null);
  const [rowActionMessage, setRowActionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tenantListError, setTenantListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectTenant = (tenant: {
    id: number;
    name: string;
    website_id?: number | null;
    owner_user_id?: number | null;
    owner_email?: string | null;
    owner_role?: string | null;
    primary_domain?: string | null;
    website_domain?: string | null;
  }) => {
    const resolvedDomain = tenant.primary_domain ?? tenant.website_domain ?? null;
    setActiveTenantId(tenant.id);
    setSelectedClient({
      id: tenant.owner_user_id ?? tenant.id,
      tenant_id: tenant.id,
      website_id: tenant.website_id ?? null,
      name: tenant.name,
      email: tenant.owner_email ?? "",
      role: tenant.owner_role ?? "tenant_owner",
      domain: resolvedDomain,
      temporaryDomainAssigned: resolvedDomain?.endsWith(".rctechbridge.com") ?? false,
    });
  };

  const loadTenants = async () => {
    setIsLoadingTenants(true);
    setTenantListError(null);

    try {
      const response = await apiClient.get<TenantListItem[]>("/tenants");
      setTenants(Array.isArray(response) ? response : []);
    } catch (loadError) {
      setTenantListError(
        loadError instanceof Error ? loadError.message : "Failed to load tenants.",
      );
    } finally {
      setIsLoadingTenants(false);
    }
  };

  const openEditModal = (tenant: TenantListItem) => {
    setEditForm({
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      timezone: tenant.timezone,
      defaultCurrency: tenant.default_currency,
      domain: tenant.primary_domain ?? tenant.website_domain ?? "",
      ownerName: tenant.owner_name ?? "",
      ownerEmail: tenant.owner_email ?? "",
      ownerPhone: tenant.owner_phone ?? "",
    });
    setEditModules(Array.isArray(tenant.enabled_modules) ? tenant.enabled_modules : []);
    setTenantListError(null);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditForm(null);
    setEditModules([]);
  };

  const filteredTenants = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const next = tenants.filter((tenant) => {
      const matchesSearch = !normalizedSearch || [
        tenant.name,
        tenant.slug,
        tenant.owner_name ?? "",
        tenant.owner_email ?? "",
        tenant.primary_domain ?? tenant.website_domain ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;
      const inviteStatus = tenant.invite_status ?? "not_sent";
      const matchesInvite = inviteFilter === "all" || inviteStatus === inviteFilter;

      return matchesSearch && matchesStatus && matchesInvite;
    });

    next.sort((left, right) => {
      switch (sortOrder) {
        case "oldest":
          return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        case "name_asc":
          return left.name.localeCompare(right.name);
        case "name_desc":
          return right.name.localeCompare(left.name);
        case "status":
          return left.status.localeCompare(right.status) || left.name.localeCompare(right.name);
        case "newest":
        default:
          return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      }
    });

    return next;
  }, [inviteFilter, searchTerm, sortOrder, statusFilter, tenants]);

  const formatTimestamp = (value: string | null) => {
    if (!value) {
      return "Never";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const inviteBadgeClasses = (status: TenantListItem["invite_status"]) => {
    switch (status) {
      case "sent":
        return "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300";
      case "partial_failure":
        return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300";
      case "failed":
        return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300";
      case "not_sent":
      default:
        return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const deliveryBadgeClasses = (status: InviteDeliveryResult["status"]) => {
    switch (status) {
      case "accepted":
        return "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300";
      case "failed":
        return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300";
      case "skipped":
      default:
        return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const inviteEmailLabels: Record<InviteEmailKey, string> = {
    welcome: "Welcome",
    reset_password: "Reset",
    intake: "Intake",
  };

  const buildInviteDeliveryResults = (
    results: Array<{ key: InviteEmailKey; result: PromiseSettledResult<{ id: string }> }>,
  ) => {
    const now = new Date().toISOString();

    return Object.fromEntries(
      results.map(({ key, result }) => {
        if (result.status === "fulfilled") {
          return [
            key,
            {
              status: "accepted",
              providerId: result.value?.id ?? null,
              message: result.value?.id
                ? `Accepted by provider (${result.value.id})`
                : "Accepted by provider",
              at: now,
            },
          ];
        }

        return [
          key,
          {
            status: "failed",
            message:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
            at: now,
          },
        ];
      }),
    );
  };

  const recordInviteAttempt = async (
    tenantId: number,
    results: Array<{ key: InviteEmailKey; result: PromiseSettledResult<{ id: string }> }>,
  ) => {
    const rawResults = results.map((entry) => entry.result);
    const rejected = rawResults.filter((result) => result.status === "rejected");
    const status = rejected.length === 0
      ? "sent"
      : rejected.length === rawResults.length
        ? "failed"
        : "partial_failure";
    const lastError = rejected
      .map((result) => {
        if (result.status !== "rejected") {
          return null;
        }
        return result.reason instanceof Error ? result.reason.message : String(result.reason);
      })
      .filter(Boolean)
      .join(" | ");

    await apiClient.post(`/tenants/${tenantId}/invite-status`, {
      status,
      lastError: lastError || undefined,
      deliveryResults: buildInviteDeliveryResults(results),
    });

    return { status, lastError };
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const user = await apiClient.getSession();
        const role = user?.role;
        if (role === "admin" || role === "platform_admin") {
          setIsAuthorized(true);
          await loadTenants();
        }
      } finally {
        setLoadingSession(false);
      }
    };

    loadSession();
  }, []);

  const slugPreview = useMemo(() => {
    if (form.tenantSlug.trim()) {
      return form.tenantSlug.trim().toLowerCase();
    }
    return form.tenantName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }, [form.tenantName, form.tenantSlug]);

  const temporaryHostnamePreview = useMemo(() => {
    return slugPreview ? `${slugPreview}.rctechbridge.com` : "tenant.rctechbridge.com";
  }, [slugPreview]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleModule = (moduleKey: string) => {
    setEnabledModules((current) =>
      current.includes(moduleKey)
        ? current.filter((value) => value !== moduleKey)
        : [...current, moduleKey],
    );
  };

  const toggleAdditionalPage = (slug: OptionalSystemPageSlug) => {
    setSelectedAdditionalPages((current) =>
      current.includes(slug)
        ? current.filter((value) => value !== slug)
        : [...current, slug],
    );
  };

  const toggleFeature = (feature: TenantFeatureToggleKey) => {
    setFeatureToggles((current) => ({
      ...current,
      [feature]: !current[feature],
    }));
  };

  const toggleEditModule = (moduleKey: string) => {
    setEditModules((current) =>
      current.includes(moduleKey)
        ? current.filter((value) => value !== moduleKey)
        : [...current, moduleKey],
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await apiClient.post<ProvisionResponse>("/tenants", {
        ...form,
        enabledModules,
        pageSlugs: selectedAdditionalPages,
        featureToggles,
      });

      setActiveTenantId(response.tenant.id);
      setSelectedClient({
        id: response.ownerUser.id,
        tenant_id: response.tenant.id,
        website_id: response.website.id,
        name: response.tenant.name,
        email: response.ownerUser.email,
        role: response.ownerUser.role,
        domain: response.website.domain,
        temporaryDomainAssigned: response.temporaryDomainAssigned ?? false,
      });

      const firstName = form.ownerName.trim().split(/\s+/)[0] || undefined;
      const inviteJobs: Array<{ key: InviteEmailKey; promise: Promise<{ id: string }> }> = [
        {
          key: "welcome",
          promise: apiClient.sendWelcomeEmailForTenant(
            response.ownerUser.email,
            firstName,
            response.tenant.id,
            response.website.id,
          ),
        },
        {
          key: "reset_password",
          promise: apiClient.sendResetPasswordEmailForTenant(
            response.ownerUser.email,
            firstName,
            response.tenant.id,
            response.website.id,
          ),
        },
        {
          key: "intake",
          promise: apiClient.sendIntakeEmail(
            response.ownerUser.email,
            response.tenant.id,
            "universal",
            firstName,
            response.website.id,
            response.tenant.name,
          ),
        },
      ];
      const emailResults = await Promise.allSettled(inviteJobs.map((job) => job.promise));
      const inviteAttempt = await recordInviteAttempt(
        response.tenant.id,
        inviteJobs.map((job, index) => ({ key: job.key, result: emailResults[index] })),
      );

      await loadTenants();

      setSuccessMessage(
        inviteAttempt.status === "sent"
          ? `Tenant ${response.tenant.name} created${response.temporaryDomainAssigned ? ` with temporary domain ${response.website.domain}` : ""}, owner emails sent, and the selected site structure was provisioned. Redirecting to onboarding...`
          : `Tenant ${response.tenant.name} created${response.temporaryDomainAssigned ? ` with temporary domain ${response.website.domain}` : ""}, and the selected site structure was provisioned, but one or more owner emails failed. Redirecting to onboarding...`,
      );
      setForm(initialState);
      setSelectedAdditionalPages([]);
      setFeatureToggles(initialFeatureToggles);
      setEnabledModules(["website_core", "seo_content", "lead_capture"]);
      window.setTimeout(() => {
        router.push("/onboarding");
      }, 600);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create tenant.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditChange = (field: keyof EditFormState, value: string) => {
    setEditForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSaveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editForm) {
      return;
    }

    setIsSavingEdit(true);
    setTenantListError(null);
    setRowActionMessage(null);

    try {
      await apiClient.put(`/tenants/${editForm.tenantId}`, {
        tenantName: editForm.tenantName,
        tenantSlug: editForm.tenantSlug,
        timezone: editForm.timezone,
        defaultCurrency: editForm.defaultCurrency,
        domain: editForm.domain,
        ownerName: editForm.ownerName,
        ownerEmail: editForm.ownerEmail,
        ownerPhone: editForm.ownerPhone,
        enabledModules: editModules,
      });

      await loadTenants();
      setRowActionMessage(`Updated ${editForm.tenantName}.`);
      closeEditModal();
    } catch (saveError) {
      setTenantListError(
        saveError instanceof Error ? saveError.message : "Failed to update tenant.",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleResendOwnerEmails = async (tenant: TenantListItem) => {
    if (!tenant.owner_email) {
      setTenantListError("Tenant owner email is missing.");
      return;
    }

    setTenantListError(null);
    setRowActionMessage(null);
    setRowActionTenantId(tenant.id);

    try {
      const firstName = tenant.owner_name?.trim().split(/\s+/)[0] || undefined;
      const inviteJobs: Array<{ key: InviteEmailKey; promise: Promise<{ id: string }> }> = [
        {
          key: "welcome",
          promise: apiClient.sendWelcomeEmailForTenant(
            tenant.owner_email,
            firstName,
            tenant.id,
            tenant.website_id ?? undefined,
          ),
        },
        {
          key: "reset_password",
          promise: apiClient.sendResetPasswordEmailForTenant(
            tenant.owner_email,
            firstName,
            tenant.id,
            tenant.website_id ?? undefined,
          ),
        },
        {
          key: "intake",
          promise: apiClient.sendIntakeEmail(
            tenant.owner_email,
            tenant.id,
            "universal",
            firstName,
            tenant.website_id ?? undefined,
            tenant.name,
          ),
        },
      ];
      const emailResults = await Promise.allSettled(inviteJobs.map((job) => job.promise));
      const inviteAttempt = await recordInviteAttempt(
        tenant.id,
        inviteJobs.map((job, index) => ({ key: job.key, result: emailResults[index] })),
      );

      await loadTenants();

      setRowActionMessage(
        inviteAttempt.status === "sent"
          ? `Resent welcome and reset emails to ${tenant.owner_email}.`
          : `Tenant owner emails were retried for ${tenant.owner_email}, but one or more deliveries failed.`,
      );
    } catch (inviteError) {
      setTenantListError(
        inviteError instanceof Error ? inviteError.message : "Failed to resend tenant owner emails.",
      );
    } finally {
      setRowActionTenantId(null);
    }
  };

  const handleResendIntakeEmail = async (tenant: TenantListItem) => {
    if (!tenant.owner_email) {
      setTenantListError("Tenant owner email is missing.");
      return;
    }

    setTenantListError(null);
    setRowActionMessage(null);
    setRowActionTenantId(tenant.id);

    try {
      const firstName = tenant.owner_name?.trim().split(/\s+/)[0] || undefined;
      const intakeJob = {
        key: "intake" as InviteEmailKey,
        promise: apiClient.sendIntakeEmail(
          tenant.owner_email,
          tenant.id,
          "universal",
          firstName,
          tenant.website_id ?? undefined,
          tenant.name,
        ),
      };
      const [result] = await Promise.allSettled([intakeJob.promise]);
      await recordInviteAttempt(tenant.id, [{ key: intakeJob.key, result }]);

      await loadTenants();

      setRowActionMessage(
        result.status === "fulfilled"
          ? `Questionnaire email resent to ${tenant.owner_email}.`
          : `Failed to resend questionnaire to ${tenant.owner_email}.`,
      );
    } catch (resendError) {
      setTenantListError(
        resendError instanceof Error ? resendError.message : "Failed to resend questionnaire email.",
      );
    } finally {
      setRowActionTenantId(null);
    }
  };

  const handleSendBillingInvite = async (tenant: TenantListItem) => {
    if (!tenant.owner_email) {
      setTenantListError("Tenant owner email is missing.");
      return;
    }
    if (!tenant.plan_key) {
      setTenantListError("Tenant has no plan assigned.");
      return;
    }

    setTenantListError(null);
    setRowActionMessage(null);
    setRowActionTenantId(tenant.id);

    try {
      // 1. Generate Stripe Checkout Session via backend
      const inviteResult = await apiClient.post<{
        checkoutUrl: string;
        plan: { plan_key: string; name: string; price_monthly_cents: number };
      }>("/billing/invite", {
        tenantId: tenant.id,
        plan_key: tenant.plan_key,
        success_url: `${window.location.origin}/billing?checkout=success`,
        cancel_url: `${window.location.origin}/billing?checkout=canceled`,
      });

      // 2. Send the email with the checkout link
      const firstName = tenant.owner_name?.trim().split(/\s+/)[0] || undefined;
      const priceFormatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
      }).format(inviteResult.plan.price_monthly_cents / 100);

      await fetch("/api/email/billing-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: tenant.owner_email,
          firstName,
          planName: inviteResult.plan.name,
          priceFormatted,
          checkoutUrl: inviteResult.checkoutUrl,
        }),
      });

      setRowActionMessage(
        `Billing invite sent to ${tenant.owner_email} for the ${inviteResult.plan.name} plan.`,
      );
    } catch (billingInviteError) {
      setTenantListError(
        billingInviteError instanceof Error
          ? billingInviteError.message
          : "Failed to send billing invite.",
      );
    } finally {
      setRowActionTenantId(null);
    }
  };

  const handleTenantStatus = async (tenant: TenantListItem, nextStatus: "active" | "suspended") => {
    setTenantListError(null);
    setRowActionMessage(null);
    setRowActionTenantId(tenant.id);

    try {
      await apiClient.post(`/tenants/${tenant.id}/status`, {
        status: nextStatus,
      });
      await loadTenants();
      setRowActionMessage(
        nextStatus === "active"
          ? `Reactivated ${tenant.name}.`
          : `Suspended ${tenant.name}.`,
      );
    } catch (statusError) {
      setTenantListError(
        statusError instanceof Error ? statusError.message : "Failed to update tenant status.",
      );
    } finally {
      setRowActionTenantId(null);
    }
  };

  if (loadingSession) {
    return <div className="text-sm text-gray-500 dark:text-gray-300">Loading tenant provisioning console...</div>;
  }

  if (!isAuthorized) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Tenants" />
        <ComponentCard
          title="Access Restricted"
          desc="Only admin roles can provision new tenants from the dashboard."
        >
          <p className="text-sm text-red-600 dark:text-red-400">
            Your current account does not have tenant provisioning access.
          </p>
        </ComponentCard>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Tenants" />
      <div className="space-y-6">
        <ComponentCard
          title="Create Tenant"
          desc="Provision a tenant, owner account, website, default site structure, and initial add-on entitlements in one admin-only workflow."
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            ) : null}
            {successMessage ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                {successMessage}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="tenantName">Tenant Name</Label>
                <Input
                  id="tenantName"
                  value={form.tenantName}
                  onChange={(event) => handleChange("tenantName", event.target.value)}
                  placeholder="Acme Electric"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tenantSlug">Tenant Slug</Label>
                <Input
                  id="tenantSlug"
                  value={form.tenantSlug}
                  onChange={(event) => handleChange("tenantSlug", event.target.value)}
                  placeholder="acme-electric"
                  hint={`Slug preview: ${slugPreview || "tenant"}`}
                />
              </div>
              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={form.domain}
                  onChange={(event) => handleChange("domain", event.target.value)}
                  placeholder="acme.example.com"
                  hint={`Optional. If left blank, a stable temporary hostname like ${temporaryHostnamePreview} will be assigned automatically.`}
                />
              </div>
              <div>
                <Label htmlFor="planKey">Plan</Label>
                <select
                  id="planKey"
                  value={form.planKey}
                  onChange={(event) => handleChange("planKey", event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  {PLAN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={form.timezone}
                  onChange={(event) => handleChange("timezone", event.target.value)}
                  placeholder="America/Chicago"
                />
              </div>
              <div>
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <Input
                  id="defaultCurrency"
                  value={form.defaultCurrency}
                  onChange={(event) => handleChange("defaultCurrency", event.target.value.toUpperCase())}
                  placeholder="USD"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Site Structure</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Tenant setup now starts from one universal page model. Core pages are included automatically, and any extra route-backed parent pages below will be created after the tenant is provisioned.
                </p>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Core Pages Included
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {CORE_PAGE_LABELS.map((label) => (
                    <div
                      key={label}
                      className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300"
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Home, Services, and About are platform-managed built-ins. Contact is created as a route-backed page during provisioning.
                </p>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Additional Pages Needed
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {OPTIONAL_TENANT_PAGE_OPTIONS.map((option) => {
                    const checked = selectedAdditionalPages.includes(option.slug);
                    return (
                      <label
                        key={option.slug}
                        className="flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAdditionalPage(option.slug)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                        />
                        <span>
                          <span className="block font-medium">{option.title}</span>
                          <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Use the feature toggles below for Shop and Reservations. This checklist is for extra route-backed parent pages only.
                </p>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Feature Toggles
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={featureToggles.shop}
                      onChange={() => toggleFeature("shop")}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span>
                      <span className="block font-medium">Shop</span>
                      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                        Enables the built-in Shop route and ecommerce checkout settings during tenant provisioning.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={featureToggles.reservations}
                      onChange={() => toggleFeature("reservations")}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span>
                      <span className="block font-medium">Reservations</span>
                      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                        Creates the Reservations parent page and activates reservation settings for the tenant.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input
                  id="ownerName"
                  value={form.ownerName}
                  onChange={(event) => handleChange("ownerName", event.target.value)}
                  placeholder="Alex Owner"
                  required
                />
              </div>
              <div>
                <Label htmlFor="ownerEmail">Owner Email</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={form.ownerEmail}
                  onChange={(event) => handleChange("ownerEmail", event.target.value)}
                  placeholder="owner@acme.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="ownerPassword">Temporary Password</Label>
                <Input
                  id="ownerPassword"
                  type="password"
                  value={form.ownerPassword}
                  onChange={(event) => handleChange("ownerPassword", event.target.value)}
                  placeholder="Create a temporary password"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="ownerPhone">Owner Phone</Label>
                <Input
                  id="ownerPhone"
                  value={form.ownerPhone}
                  onChange={(event) => handleChange("ownerPhone", event.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>

            <div>
              <Label className="mb-3">Enabled Modules / Add-Ons</Label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {MODULE_OPTIONS.map((option) => {
                  const checked = enabledModules.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModule(option.value)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Baseline modules are provisioned automatically. Add-on selections seed tenant entitlements and initial feature flags.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(initialState);
                  setSelectedAdditionalPages([]);
                  setFeatureToggles(initialFeatureToggles);
                  setEnabledModules(["website_core", "seo_content", "lead_capture"]);
                  setError(null);
                  setSuccessMessage(null);
                }}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating Tenant..." : "Create Tenant"}
              </Button>
            </div>
          </form>
        </ComponentCard>

        <ComponentCard
          title="Manage Tenants"
          desc="Review existing tenants, select an active tenant context, and jump directly into onboarding or site operations."
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by tenant, owner, email, or domain"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              value={inviteFilter}
              onChange={(event) => setInviteFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">All Invite States</option>
              <option value="not_sent">Not Sent</option>
              <option value="sent">Sent</option>
              <option value="partial_failure">Partial Failure</option>
              <option value="failed">Failed</option>
            </select>
            <div className="flex items-center gap-2">
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
                <option value="status">Status</option>
              </select>
              <Button type="button" variant="outline" onClick={loadTenants} disabled={isLoadingTenants}>
                {isLoadingTenants ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{filteredTenants.length} tenant{filteredTenants.length === 1 ? "" : "s"} shown</span>
            <span>Invite tracking shows persisted status, attempts, and last send result.</span>
          </div>

          {tenantListError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {tenantListError}
            </div>
          ) : null}

          {rowActionMessage ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
              {rowActionMessage}
            </div>
          ) : null}

          {isLoadingTenants ? (
            <p className="text-sm text-gray-500 dark:text-gray-300">Loading tenants...</p>
          ) : null}

          {!isLoadingTenants && filteredTenants.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-300">
              No tenants matched the current filters.
            </p>
          ) : null}

          {filteredTenants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Seats</th>
                    <th className="px-4 py-3">Modules</th>
                    <th className="px-4 py-3">Invite Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-gray-900 dark:text-white">{tenant.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">slug: {tenant.slug}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {tenant.status}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-gray-900 dark:text-white">{tenant.owner_name ?? "Unassigned"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{tenant.owner_email ?? "No owner email"}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize text-gray-700 dark:text-gray-300">
                          {tenant.plan_key ?? "none"}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-gray-900 dark:text-white">{tenant.primary_domain ?? tenant.website_domain ?? "No domain"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {tenant.primary_domain_status ?? "domain not configured"}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {tenant.seat_used}{tenant.seat_limit != null ? ` / ${tenant.seat_limit}` : ""}
                        </p>
                        {tenant.seat_limit != null && tenant.seat_used >= tenant.seat_limit ? (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">At limit</span>
                        ) : tenant.seat_limit == null ? (
                          <span className="text-xs text-gray-400">Unlimited</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {(tenant.enabled_modules ?? []).length > 0
                            ? tenant.enabled_modules.join(", ")
                            : "No enabled modules"}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${inviteBadgeClasses(tenant.invite_status)}`}>
                          {(tenant.invite_status ?? "not_sent").replace(/_/g, " ")}
                        </span>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Attempts: {tenant.invite_attempt_count ?? 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Last attempt: {formatTimestamp(tenant.last_attempted_at)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Last sent: {formatTimestamp(tenant.last_sent_at)}
                        </p>
                        {tenant.delivery_results ? (
                          <div className="mt-2 space-y-2">
                            {(Object.entries(tenant.delivery_results) as Array<[InviteEmailKey, InviteDeliveryResultRecord[InviteEmailKey]]>).map(([key, result]) => (
                              <div key={`${tenant.id}-${key}`} className="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    {inviteEmailLabels[key]}
                                  </span>
                                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${deliveryBadgeClasses(result.status)}`}>
                                    {result.status}
                                  </span>
                                </div>
                                {result.message ? (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {result.message}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {tenant.last_error ? (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            {tenant.last_error}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => selectTenant(tenant)}
                          >
                            Select
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              selectTenant(tenant);
                              router.push("/onboarding");
                            }}
                          >
                            Onboard
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              selectTenant(tenant);
                              router.push("/site-settings");
                            }}
                            disabled={!tenant.website_id}
                          >
                            Site Settings
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(tenant)}
                            disabled={rowActionTenantId === tenant.id}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleResendOwnerEmails(tenant)}
                            disabled={!tenant.owner_email || rowActionTenantId === tenant.id}
                          >
                            {rowActionTenantId === tenant.id ? "Working..." : "Resend Invite"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleResendIntakeEmail(tenant)}
                            disabled={!tenant.owner_email || rowActionTenantId === tenant.id}
                          >
                            {rowActionTenantId === tenant.id ? "Working..." : "Resend Questionnaire"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendBillingInvite(tenant)}
                            disabled={!tenant.owner_email || !tenant.plan_key || rowActionTenantId === tenant.id}
                          >
                            {rowActionTenantId === tenant.id ? "Working..." : "Billing Invite"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleTenantStatus(tenant, tenant.status === "active" ? "suspended" : "active")}
                            disabled={rowActionTenantId === tenant.id}
                          >
                            {tenant.status === "active" ? "Suspend" : "Reactivate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </ComponentCard>

        <Modal isOpen={isEditOpen} onClose={closeEditModal} className="max-w-[840px] m-4">
          <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
            <div className="mb-6 pr-10">
              <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Edit Tenant</h4>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Update tenant metadata, owner contact details, and managed add-on modules.
              </p>
            </div>

            {editForm ? (
              <form className="space-y-6" onSubmit={handleSaveEdit}>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <Label htmlFor="editTenantName">Tenant Name</Label>
                    <Input id="editTenantName" value={editForm.tenantName} onChange={(event) => handleEditChange("tenantName", event.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="editTenantSlug">Tenant Slug</Label>
                    <Input id="editTenantSlug" value={editForm.tenantSlug} onChange={(event) => handleEditChange("tenantSlug", event.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="editTimezone">Timezone</Label>
                    <Input id="editTimezone" value={editForm.timezone} onChange={(event) => handleEditChange("timezone", event.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="editCurrency">Default Currency</Label>
                    <Input id="editCurrency" value={editForm.defaultCurrency} onChange={(event) => handleEditChange("defaultCurrency", event.target.value.toUpperCase())} />
                  </div>
                  <div>
                    <Label htmlFor="editDomain">Primary Domain</Label>
                    <Input id="editDomain" value={editForm.domain} onChange={(event) => handleEditChange("domain", event.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="editOwnerName">Owner Name</Label>
                    <Input id="editOwnerName" value={editForm.ownerName} onChange={(event) => handleEditChange("ownerName", event.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="editOwnerEmail">Owner Email</Label>
                    <Input id="editOwnerEmail" type="email" value={editForm.ownerEmail} onChange={(event) => handleEditChange("ownerEmail", event.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="editOwnerPhone">Owner Phone</Label>
                    <Input id="editOwnerPhone" value={editForm.ownerPhone} onChange={(event) => handleEditChange("ownerPhone", event.target.value)} />
                  </div>
                </div>

                <div>
                  <Label className="mb-3">Managed Modules / Add-Ons</Label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {MODULE_OPTIONS.map((option) => {
                      const checked = editModules.includes(option.value);
                      return (
                        <label key={option.value} className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEditModule(option.value)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={closeEditModal} disabled={isSavingEdit}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSavingEdit}>
                    {isSavingEdit ? "Saving..." : "Save Tenant"}
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        </Modal>
      </div>
    </div>
  );
}