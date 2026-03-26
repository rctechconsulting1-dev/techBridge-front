"use client";

import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { useSidebar } from "@/context/SidebarContext";
import { getBuiltInPagePreviewPath } from "@/lib/builtInPageContent";

type BuiltInPageCard = {
  title: string;
  route: string;
  purpose: string;
  editors: Array<{ label: string; href: string }>;
  notes: string;
};

const builtInPageCards: BuiltInPageCard[] = [
  {
    title: "Home",
    route: "/",
    purpose:
      "Primary tenant landing page with a dedicated page-content model for hero copy and current homepage sections.",
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
    editors: [
      { label: "Open Shop Editor", href: "/built-in-pages/shop" },
      { label: "Shop", href: "/site-settings?tab=shop" },
      { label: "Global Site Settings", href: "/site-settings?tab=settings" },
    ],
    notes:
      "This route is only used when ecommerce is enabled. Do not create a custom page for /shop.",
  },
];

export default function BuiltInPagesPage() {
  const { selectedClient } = useSidebar();
  const websiteId = selectedClient?.website_id ?? null;

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Built-in Pages" />

      <ComponentCard
        title="Built-in Pages Workflow"
        desc="Use this page to work through the platform-managed routes separately from custom client pages."
      >
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Built-in pages are the default MVP page set for a tenant. Different business types may use different built-ins over time, but the current platform-managed routes are <strong>/</strong>, <strong>/services</strong>, <strong>/about</strong>, and <strong>/shop</strong>.
          </p>
          <p>
            Use <strong>Custom Pages</strong> only for extra slugs beyond those built-ins.
          </p>
          <div className="flex flex-wrap gap-2">
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
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {builtInPageCards.map((card) => (
            <ComponentCard key={card.route} title={`${card.title} ${card.route}`}>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <p>{card.purpose}</p>
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
                    {websiteId ? (
                      <Link
                        href={getBuiltInPagePreviewPath(
                          websiteId,
                          card.route === "/"
                            ? "home"
                            : (card.route.slice(1) as "services" | "about" | "shop"),
                        )}
                        target="_blank"
                        className="rounded-lg border border-[#CD7F32] px-3 py-1.5 text-xs font-semibold text-[#CD7F32] hover:bg-[#CD7F32]/10"
                      >
                        Preview
                      </Link>
                    ) : null}
                  </div>
                </div>
                <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                  {card.notes}
                </p>
              </div>
            </ComponentCard>
          ))}
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