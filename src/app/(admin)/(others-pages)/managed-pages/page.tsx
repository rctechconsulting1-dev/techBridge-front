"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { useSidebar } from "@/context/SidebarContext";
import { OPTIONAL_SYSTEM_PAGE_CONFIGS } from "@/lib/page-management";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId, getStoredAuthToken } from "@/lib/auth-context";
import type { FooterNavLink, Page } from "@/lib/cms-types";

const featuredSlugs = new Set(["contact", "faq", "blog", "locations"]);

const normalizeOptionalRouteSlug = (href: string | null | undefined) => {
  if (!href) {
    return "";
  }

  return href
    .split(/[?#]/)[0]
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
};

export default function ManagedPagesIndexPage() {
  const { selectedClient } = useSidebar();
  const websiteId = Number(selectedClient?.website_id || 0) || null;
  const selectedTenantId =
    Number(selectedClient?.tenant_id || getActiveTenantId() || 0) || null;
  const [headerNavLinks, setHeaderNavLinks] = useState<FooterNavLink[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUnusedRoutes, setShowUnusedRoutes] = useState(false);

  useEffect(() => {
    if (!websiteId) {
      setHeaderNavLinks([]);
      setPages([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadManagedPageState = async () => {
      setIsLoading(true);

      try {
        const headers = {
          ...(getStoredAuthToken()
            ? { Authorization: `Bearer ${getStoredAuthToken()}` }
            : {}),
          ...(selectedTenantId ? { "x-tenant-id": String(selectedTenantId) } : {}),
        };

        const [settingsResponse, pagesResponse] = await Promise.all([
          fetch(`${getApiBaseUrl()}/site-settings/${websiteId}`, {
            cache: "no-store",
            headers,
          }),
          fetch(`${getApiBaseUrl()}/pages?website_id=${websiteId}`, {
            cache: "no-store",
            headers,
          }),
        ]);

        const settingsPayload = settingsResponse.ok
          ? ((await settingsResponse.json()) as { header_nav_links?: FooterNavLink[] | null })
          : null;
        const pagesPayload = pagesResponse.ok
          ? ((await pagesResponse.json()) as Page[])
          : [];

        if (cancelled) {
          return;
        }

        setHeaderNavLinks(Array.isArray(settingsPayload?.header_nav_links)
          ? settingsPayload.header_nav_links
          : []);
        setPages(Array.isArray(pagesPayload) ? pagesPayload : []);
      } catch {
        if (cancelled) {
          return;
        }

        setHeaderNavLinks([]);
        setPages([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadManagedPageState();

    return () => {
      cancelled = true;
    };
  }, [selectedTenantId, websiteId]);

  const pageBySlug = useMemo(() => {
    const entries = new Map<string, Page>();

    for (const page of pages) {
      const slug = normalizeOptionalRouteSlug(page.slug || page.path || "");
      if (!featuredSlugs.has(slug)) {
        continue;
      }

      const existing = entries.get(slug);
      const pageIsActive = page.is_published && (page.is_enabled ?? true);
      const existingIsActive = existing
        ? existing.is_published && (existing.is_enabled ?? true)
        : false;

      if (!existing || (pageIsActive && !existingIsActive)) {
        entries.set(slug, page);
      }
    }

    return entries;
  }, [pages]);

  const headerNavSlugSet = useMemo(() => {
    return new Set(
      headerNavLinks
        .filter((link) => link.location !== "footer")
        .map((link) => normalizeOptionalRouteSlug(link.href))
        .filter((slug) => featuredSlugs.has(slug)),
    );
  }, [headerNavLinks]);

  const managedConfigs = useMemo(() => {
    return OPTIONAL_SYSTEM_PAGE_CONFIGS.filter((config) => featuredSlugs.has(config.slug)).map((config) => {
      const page = pageBySlug.get(config.slug) ?? null;
      const inHeaderNav = headerNavSlugSet.has(config.slug);
      const pageIsActive = page ? page.is_published && (page.is_enabled ?? true) : false;

      return {
        config,
        page,
        inHeaderNav,
        pageIsActive,
        isActive: inHeaderNav || pageIsActive,
      };
    });
  }, [headerNavSlugSet, pageBySlug]);

  const activeConfigs = managedConfigs.filter((item) => item.isActive);
  const inactiveConfigs = managedConfigs.filter((item) => !item.isActive);

  const renderConfigCard = (
    item: (typeof managedConfigs)[number],
    options?: { muted?: boolean },
  ) => {
    const badge = item.inHeaderNav
      ? { label: "In Header Nav", className: "border-emerald-200 bg-emerald-50 text-emerald-700" }
      : item.pageIsActive
        ? { label: "Published Route", className: "border-blue-200 bg-blue-50 text-blue-700" }
        : { label: "Not Active", className: "border-gray-200 bg-gray-50 text-gray-600" };

    return (
      <ComponentCard key={item.config.slug} title={`${item.config.title} /${item.config.slug}`}>
        <div className={`space-y-4 text-sm ${options?.muted ? "text-gray-500 dark:text-gray-400" : "text-gray-600 dark:text-gray-300"}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p>{item.config.description}</p>
            <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Workflow
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {item.isActive
                ? "This route is part of the current tenant setup. Use Site Settings for enable, publish, and header placement. Use this editor entry for page content and SEO setup."
                : "This optional route is not currently active for the tenant. Enable or place it in header navigation from Site Settings before treating it as part of the live nav model."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/managed-pages/${item.config.slug}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Open Managed Editor
            </Link>
            <Link
              href="/site-settings"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Configure in Site Settings
            </Link>
          </div>
        </div>
      </ComponentCard>
    );
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Managed Pages" />

      <ComponentCard
        title="Managed Parent Pages"
        desc="Edit system-owned parent routes here, while Site Settings keeps enable, publish, and header behavior aligned with the navigation model."
      >
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Managed Pages cover optional system parent routes like Contact, FAQ, Blog, and Locations. Use <strong>Built-in Pages</strong> to edit Home, Services, About, and Shop. Use <strong>Site Settings</strong> to enable optional managed routes. Use <strong>Custom Pages</strong> to create child pages and extra non-system routes.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/site-settings"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Enable Optional Pages
            </Link>
            <Link
              href="/main-page"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Create Custom Page
            </Link>
          </div>
        </div>
      </ComponentCard>

      {selectedClient ? (
        <div className="space-y-6">
          <ComponentCard
            title="Tenant-Used Managed Pages"
            desc="The main list now prioritizes optional parent routes that are actually active for the selected tenant."
          >
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {isLoading
                ? "Loading the tenant navigation and page state..."
                : activeConfigs.length > 0
                  ? "These optional system pages are currently part of the tenant setup because they are in header navigation or already published as active routes."
                  : "No optional managed pages are active for this tenant right now. Use Site Settings if you want to turn one on."}
            </p>
          </ComponentCard>

          {activeConfigs.length > 0 && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {activeConfigs.map((item) => renderConfigCard(item))}
            </div>
          )}

          {inactiveConfigs.length > 0 && !isLoading && (
            <ComponentCard
              title="Unused Optional Routes"
              desc="These system pages exist in the platform catalog but are not currently active for the selected tenant."
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  RnR should not read like it has these routes live. They stay available for future use, but they are hidden from the main Managed Pages list until needed.
                </p>
                <button
                  type="button"
                  onClick={() => setShowUnusedRoutes((current) => !current)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {showUnusedRoutes ? "Hide Unused Optional Routes" : `Show ${inactiveConfigs.length} Unused Optional Route${inactiveConfigs.length === 1 ? "" : "s"}`}
                </button>
                {showUnusedRoutes && (
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {inactiveConfigs.map((item) => renderConfigCard(item, { muted: true }))}
                  </div>
                )}
              </div>
            </ComponentCard>
          )}
        </div>
      ) : (
        <ComponentCard title="Managed Pages">
          <p className="text-sm text-gray-500">
            Select a tenant in the sidebar first to manage Contact, FAQ, Blog, and Locations.
          </p>
        </ComponentCard>
      )}
    </div>
  );
}
