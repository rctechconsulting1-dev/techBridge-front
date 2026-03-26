"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { useSidebar } from "@/context/SidebarContext";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId, getStoredAuthToken } from "@/lib/auth-context";
import {
  BUILT_IN_PAGE_KEYS,
  BUILT_IN_PAGE_LABELS,
  getBuiltInPagePreviewPath,
} from "@/lib/builtInPageContent";
import type { BuiltInPageKey } from "@/lib/cms-types";

type PageFieldConfig = {
  key: string;
  label: string;
  hint?: string;
  textarea?: boolean;
};

const INPUT =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const LABEL =
  "mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";

const PAGE_DESCRIPTIONS: Record<BuiltInPageKey, string> = {
  home: "Control the homepage hero independently from tenant-wide branding and contact settings.",
  services:
    "Edit the built-in Services page intro and empty-state copy while service records stay in the Services collection.",
  about:
    "Edit the built-in About page story and mission copy while team profiles stay in the Team collection.",
  shop: "Edit the built-in Shop page headline and empty-state messaging separately from catalog data.",
};

const PAGE_FIELD_CONFIG: Record<BuiltInPageKey, PageFieldConfig[]> = {
  home: [
    { key: "heroTitle", label: "Hero title" },
    { key: "heroBody", label: "Hero body", textarea: true },
    { key: "heroPrimaryCtaText", label: "Primary CTA text" },
    { key: "heroPrimaryCtaUrl", label: "Primary CTA URL", hint: "Example: /contact or #contact" },
    { key: "heroBackgroundImageUrl", label: "Background image URL" },
    { key: "heroBackgroundOverlayColor", label: "Background overlay color", hint: "Example: #000000" },
  ],
  services: [
    { key: "heroTitle", label: "Hero title" },
    { key: "heroBody", label: "Hero body", textarea: true },
    { key: "emptyStateTitle", label: "Empty-state title" },
    { key: "emptyStateBody", label: "Empty-state body", textarea: true },
  ],
  about: [
    { key: "heroTitle", label: "Hero title" },
    { key: "heroBody", label: "Hero body", textarea: true },
    { key: "missionTitle", label: "Mission section title" },
    { key: "missionBody", label: "Mission section body", textarea: true },
  ],
  shop: [
    { key: "heroTitle", label: "Hero title" },
    { key: "heroBody", label: "Hero body", textarea: true },
    { key: "emptyStateTitle", label: "Empty-state title" },
    { key: "emptyStateBody", label: "Empty-state body", textarea: true },
  ],
};

const RELATED_LINKS: Record<
  BuiltInPageKey,
  Array<{ label: string; href: string }>
> = {
  home: [
    { label: "Global Site Settings", href: "/site-settings?tab=settings" },
    { label: "Branding", href: "/branding" },
  ],
  services: [
    { label: "Service Records", href: "/site-settings?tab=services" },
    { label: "Global Site Settings", href: "/site-settings?tab=settings" },
  ],
  about: [
    { label: "Team Profiles", href: "/site-settings?tab=team" },
    { label: "Branding", href: "/branding" },
  ],
  shop: [
    { label: "Product Catalog", href: "/site-settings?tab=shop" },
    { label: "Global Site Settings", href: "/site-settings?tab=settings" },
  ],
};

const normalizeStringRecord = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      typeof item === "string" ? item : "",
    ]),
  );
};

const authHeaders = () => {
  const token = getStoredAuthToken();
  const tenantId = getActiveTenantId();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { "x-tenant-id": String(tenantId) } : {}),
  };
};

function TextField({
  label,
  value,
  onChange,
  hint,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  hint?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {textarea ? (
        <textarea
          className={`${INPUT} min-h-28`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={INPUT}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

export default function BuiltInPageEditorPage() {
  const params = useParams<{ pageKey: string }>();
  const { selectedClient } = useSidebar();
  const [content, setContent] = useState<Record<string, string>>({});
  const [seo, setSeo] = useState({ title: "", description: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const pageKey = useMemo(() => {
    const rawPageKey = Array.isArray(params?.pageKey)
      ? params.pageKey[0]
      : params?.pageKey;
    return BUILT_IN_PAGE_KEYS.includes(rawPageKey as BuiltInPageKey)
      ? (rawPageKey as BuiltInPageKey)
      : null;
  }, [params?.pageKey]);

  const websiteId = selectedClient?.website_id ?? null;

  useEffect(() => {
    if (!pageKey || !websiteId) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const loadPageContent = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/built-in-page-content/${pageKey}?website_id=${websiteId}`,
          {
            headers: authHeaders(),
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to load ${pageKey} page content`);
        }

        const payload = await response.json();
        if (isCancelled) {
          return;
        }

        setContent(normalizeStringRecord(payload.content));
        setSeo({
          title: typeof payload.seo?.title === "string" ? payload.seo.title : "",
          description:
            typeof payload.seo?.description === "string"
              ? payload.seo.description
              : "",
        });
        setUpdatedAt(payload.updated_at ?? null);
      } catch (error) {
        if (!isCancelled) {
          const message =
            error instanceof Error ? error.message : "Failed to load page content";
          toast.error(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPageContent();

    return () => {
      isCancelled = true;
    };
  }, [pageKey, websiteId]);

  if (!pageKey) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Built-in Pages" />
        <ComponentCard title="Invalid Built-in Page">
          <p className="text-sm text-rose-600 dark:text-rose-300">
            This built-in page editor does not exist.
          </p>
          <Link
            href="/built-in-pages"
            className="inline-flex rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Back to Built-in Pages
          </Link>
        </ComponentCard>
      </div>
    );
  }

  const pageTitle = `${BUILT_IN_PAGE_LABELS[pageKey]} Page`;
  const fieldConfig = PAGE_FIELD_CONFIG[pageKey];
  const relatedLinks = RELATED_LINKS[pageKey];

  const savePageContent = async () => {
    if (!websiteId) {
      toast.error("Select a tenant first.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/built-in-page-content/${pageKey}`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            website_id: websiteId,
            content,
            seo,
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to save ${pageTitle}`);
      }

      const payload = await response.json();
      setUpdatedAt(payload.updated_at ?? new Date().toISOString());
      toast.success(`${pageTitle} saved`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to save ${pageTitle}`;
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={pageTitle} />

      {!selectedClient ? (
        <ComponentCard title="No Active Tenant">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Select a tenant in the sidebar first to edit built-in page content.
          </p>
        </ComponentCard>
      ) : null}

      <ComponentCard title={`${pageTitle} Content`} desc={PAGE_DESCRIPTIONS[pageKey]}>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/built-in-pages"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Back to Built-in Pages
          </Link>
          {relatedLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {link.label}
            </Link>
          ))}
          {websiteId ? (
            <Link
              href={getBuiltInPagePreviewPath(websiteId, pageKey)}
              target="_blank"
              className="rounded-lg border border-[#CD7F32] px-3 py-1.5 text-xs font-semibold text-[#CD7F32] hover:bg-[#CD7F32]/10"
            >
              Preview
            </Link>
          ) : null}
        </div>

        {updatedAt ? (
          <p className="text-xs text-gray-500">Last updated: {updatedAt}</p>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading page content…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {fieldConfig.map((field) => (
                <div
                  key={field.key}
                  className={field.textarea ? "lg:col-span-2" : undefined}
                >
                  <TextField
                    label={field.label}
                    value={content[field.key] ?? ""}
                    onChange={(nextValue) =>
                      setContent((current) => ({
                        ...current,
                        [field.key]: nextValue,
                      }))
                    }
                    hint={field.hint}
                    textarea={field.textarea}
                  />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                SEO
              </p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TextField
                  label="SEO title"
                  value={seo.title}
                  onChange={(nextValue) =>
                    setSeo((current) => ({ ...current, title: nextValue }))
                  }
                />
                <div className="lg:col-span-2">
                  <TextField
                    label="SEO description"
                    value={seo.description}
                    onChange={(nextValue) =>
                      setSeo((current) => ({ ...current, description: nextValue }))
                    }
                    textarea
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={savePageContent}
                disabled={!selectedClient || isSaving}
                className="rounded-lg bg-[#CD7F32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b06d2b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : `Save ${pageTitle}`}
              </button>
            </div>
          </>
        )}
      </ComponentCard>
    </div>
  );
}