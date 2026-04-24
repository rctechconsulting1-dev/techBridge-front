"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { useSidebar } from "@/context/SidebarContext";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId, getStoredAuthToken } from "@/lib/auth-context";
import { getBuiltInPagePreviewPath } from "@/lib/builtInPageContent";
import type { FooterNavLink } from "@/lib/cms-types";

type BuiltInPageCard = {
  title: string;
  route: string;
  purpose: string;
  strategy: string;
  recipes: string[];
  sections: string[];
  previewLabel: string;
  editors: Array<{ label: string; href: string }>;
  notes: string;
};

const builtInPageCards: BuiltInPageCard[] = [
  {
    title: "Home",
    route: "/",
    purpose:
      "Primary tenant landing page with a dedicated page-content model for hero copy and current homepage sections.",
    strategy: "Guided recipe-based homepage with conversion-mode-aware CTA and theme-pack styling.",
    recipes: ["Local Lead Gen", "Authority Trust", "Booking First", "Offer Funnel"],
    sections: ["Hero", "Trust Bar", "Services", "Testimonials", "CTA"],
    previewLabel: "Homepage preview",
    editors: [
      { label: "Open Home Editor", href: "/built-in-pages/home" },
      { label: "Global Site Settings", href: "/site-settings?tab=settings" },
      { label: "Branding", href: "/branding" },
    ],
    notes:
      "Use the Home editor for homepage hero copy. Do not create a custom page for /.",
  },
  {
    title: "Services",
    route: "/services",
    purpose:
      "Built-in services listing page driven by service records plus a dedicated page intro model.",
    strategy: "Service overview page with layout variants tuned for scanability, categorization, or problem-solution framing.",
    recipes: ["Service Grid", "Service Categories", "Problem Solution"],
    sections: ["Hero", "Services List", "FAQ", "CTA"],
    previewLabel: "Services route preview",
    editors: [
      { label: "Open Services Editor", href: "/built-in-pages/services" },
      { label: "Services", href: "/site-settings?tab=services" },
      { label: "Global Site Settings", href: "/site-settings?tab=settings" },
    ],
    notes:
      "Use Custom Pages only for additional service-related slugs like /commercial or /financing.",
  },
  {
    title: "About",
    route: "/about",
    purpose:
      "Built-in about page driven by team content plus dedicated story and mission content.",
    strategy: "Trust-building page that combines founder or team story with proof and a contact path.",
    recipes: ["Founder Story", "Team Credibility", "Mission Trust"],
    sections: ["Hero", "Mission", "Team", "Testimonials", "CTA"],
    previewLabel: "About route preview",
    editors: [
      { label: "Open About Editor", href: "/built-in-pages/about" },
      { label: "Team", href: "/site-settings?tab=team" },
      { label: "Branding", href: "/branding" },
    ],
    notes:
      "Use this route for the standard company story. Create a custom slug only if the client needs a separate page like /our-story or /leadership.",
  },
  {
    title: "Shop",
    route: "/shop",
    purpose:
      "Built-in ecommerce page powered by the tenant product catalog plus dedicated shop-page messaging.",
    strategy: "Merchandising page that balances discovery, featured product visibility, and conversion-focused CTA treatment.",
    recipes: ["Catalog First", "Featured Products", "Offer First"],
    sections: ["Hero", "Catalog", "Featured", "CTA"],
    previewLabel: "Shop route preview",
    editors: [
      { label: "Open Shop Editor", href: "/built-in-pages/shop" },
      { label: "Shop", href: "/site-settings?tab=shop" },
      { label: "Global Site Settings", href: "/site-settings?tab=settings" },
    ],
    notes:
      "This route is only used when ecommerce is enabled. Do not create a custom page for /shop.",
  },
];

const normalizeRoutePath = (href: string | null | undefined) => {
  if (!href) {
    return "/";
  }

  const normalized = href.split(/[?#]/)[0].replace(/\/+$/, "");
  return normalized || "/";
};

export default function BuiltInPagesPage() {
  const { selectedClient } = useSidebar();
  const websiteId = Number(selectedClient?.website_id || 0) || null;
  const selectedTenantId =
    Number(selectedClient?.tenant_id || getActiveTenantId() || 0) || null;
  const [ecommerceEnabled, setEcommerceEnabled] = useState<boolean | null>(null);
  const [headerNavLinks, setHeaderNavLinks] = useState<FooterNavLink[]>([]);

  const headerNavRouteSet = useMemo(
    () =>
      new Set(
        headerNavLinks
          .filter((link) => link.location !== "footer")
          .map((link) => normalizeRoutePath(link.href)),
      ),
    [headerNavLinks],
  );

  const activeBuiltInPageCards = useMemo(
    () => builtInPageCards.filter((card) => card.route !== "/shop" || (ecommerceEnabled === true && headerNavRouteSet.has("/shop"))),
    [ecommerceEnabled, headerNavRouteSet],
  );

  const inactiveBuiltInPageCards = useMemo(
    () => builtInPageCards.filter((card) => card.route === "/shop" && (!headerNavRouteSet.has("/shop") || ecommerceEnabled !== true)),
    [ecommerceEnabled, headerNavRouteSet],
  );

  useEffect(() => {
    if (!websiteId) {
      setEcommerceEnabled(null);
      setHeaderNavLinks([]);
      return;
    }

    let cancelled = false;

    const loadSiteSettings = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/site-settings/${websiteId}`, {
          cache: "no-store",
          headers: {
            ...(getStoredAuthToken()
              ? { Authorization: `Bearer ${getStoredAuthToken()}` }
              : {}),
            ...(selectedTenantId ? { "x-tenant-id": String(selectedTenantId) } : {}),
          },
        });

        if (!response.ok) {
          if (!cancelled) {
            setEcommerceEnabled(null);
          }
          return;
        }

        const payload = (await response.json()) as {
          ecommerce_enabled?: boolean | null;
          header_nav_links?: FooterNavLink[] | null;
        };
        if (!cancelled) {
          setEcommerceEnabled(payload.ecommerce_enabled === true);
          setHeaderNavLinks(Array.isArray(payload.header_nav_links) ? payload.header_nav_links : []);
        }
      } catch {
        if (!cancelled) {
          setEcommerceEnabled(null);
          setHeaderNavLinks([]);
        }
      }
    };

    void loadSiteSettings();

    return () => {
      cancelled = true;
    };
  }, [selectedTenantId, websiteId]);

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Built-in Pages" />

      <ComponentCard
        title="Built-in Pages Workflow"
        desc="Use this page to work through the platform-managed routes separately from custom client pages."
      >
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Built-in pages are the default core page set for a tenant. The current platform-managed routes are <strong>/</strong>, <strong>/services</strong>, <strong>/about</strong>, and <strong>/shop</strong>.
          </p>
          <p>
            Use <strong>Custom Pages</strong> only for extra slugs beyond those built-ins.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/managed-pages"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Open Managed Pages
            </Link>
            <Link
              href="/main-page"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Open Custom Pages
            </Link>
            <Link
              href="/site-settings"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Open Global Site Settings
            </Link>
          </div>
        </div>
      </ComponentCard>

      {selectedClient ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {activeBuiltInPageCards.map((card) => {
            const pageKey =
              card.route === "/"
                ? "home"
                : (card.route.slice(1) as "services" | "about" | "shop");
            const shopPreviewAvailable = pageKey !== "shop" || ecommerceEnabled === true;

            return (
              <ComponentCard key={card.route} title={`${card.title} ${card.route}`}>
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                  <p>{card.purpose}</p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/30">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Strategy Preview
                    </p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{card.strategy}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {card.recipes.map((recipe) => (
                        <span
                          key={`${card.route}-${recipe}`}
                          className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:text-gray-300"
                        >
                          {recipe}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {card.sections.map((section) => (
                        <span
                          key={`${card.route}-${section}`}
                          className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-950/60 dark:text-gray-300"
                        >
                          {section}
                        </span>
                      ))}
                    </div>
                  </div>
                  {websiteId && shopPreviewAvailable ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
                      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {card.previewLabel}
                        </p>
                        <Link
                          href={getBuiltInPagePreviewPath(websiteId, pageKey)}
                          target="_blank"
                          className="text-[11px] font-semibold uppercase tracking-wide text-[#CD7F32] hover:opacity-80"
                        >
                          Open Live
                        </Link>
                      </div>
                      <div className="relative h-56 overflow-hidden bg-[#f6f3ee] dark:bg-gray-900">
                        <div className="pointer-events-none absolute inset-0 origin-top-left scale-[0.38] overflow-hidden" style={{ width: "263%", height: "263%" }}>
                          <iframe
                            title={`${card.title} preview`}
                            src={getBuiltInPagePreviewPath(websiteId, pageKey)}
                            className="h-full w-full border-0 bg-white"
                            loading="lazy"
                          />
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/85 to-transparent dark:from-gray-950 dark:via-gray-950/70" />
                      </div>
                    </div>
                  ) : websiteId && pageKey === "shop" ? (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                      Shop preview is unavailable because ecommerce is not enabled for this tenant. Enable ecommerce in Site Settings to activate the live /shop route.
                    </div>
                  ) : null}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Recommended editors
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {card.editors.map((editor) => (
                        <Link
                          key={`${card.route}-${editor.href}`}
                          href={editor.href}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          {editor.label}
                        </Link>
                      ))}
                      {websiteId && shopPreviewAvailable ? (
                        <Link
                          href={getBuiltInPagePreviewPath(websiteId, pageKey)}
                          target="_blank"
                          className="rounded-lg border border-[#CD7F32] px-3 py-1.5 text-xs font-semibold text-[#CD7F32] hover:bg-[#CD7F32]/10"
                        >
                          Preview
                        </Link>
                      ) : websiteId && pageKey === "shop" ? (
                        <span className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:text-amber-200">
                          Preview disabled until ecommerce is enabled
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                    {card.notes}
                  </p>
                </div>
              </ComponentCard>
            );
          })}
          </div>

          {inactiveBuiltInPageCards.length > 0 && (
            <ComponentCard
              title="Available But Not Active"
              desc="These built-in routes exist in the platform, but they are not currently part of the tenant's active nav setup."
            >
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <p>
                  Shop stays available as a built-in route, but it is kept out of the main Built-in Pages list until the tenant is actively using it.
                </p>
                <div className="flex flex-wrap gap-2">
                  {inactiveBuiltInPageCards.map((card) => (
                    <span
                      key={`inactive-pill-${card.route}`}
                      className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
                    >
                      {card.title} {card.route}
                    </span>
                  ))}
                </div>
              </div>
            </ComponentCard>
          )}
        </div>
      ) : (
        <ComponentCard title="No Active Tenant">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Select a tenant in the sidebar first to manage built-in pages and preview the current site routes.
          </p>
        </ComponentCard>
      )}
    </div>
  );
}