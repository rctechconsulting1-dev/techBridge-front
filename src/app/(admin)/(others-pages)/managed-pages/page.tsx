"use client";

import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { useSidebar } from "@/context/SidebarContext";
import { OPTIONAL_SYSTEM_PAGE_CONFIGS } from "@/lib/page-management";

const featuredSlugs = new Set(["contact", "faq", "blog", "locations"]);

export default function ManagedPagesIndexPage() {
  const { selectedClient } = useSidebar();

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Managed Pages" />

      <ComponentCard
        title="Managed Parent Pages"
        desc="Edit system-owned parent routes here, while Site Settings keeps enable, publish, and header behavior aligned with the navigation model."
      >
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Managed Pages cover optional system parent routes like Contact, FAQ, Blog, and Locations. Use <strong>Built-in Pages</strong> for Home, Services, About, and Shop. Use <strong>Custom Pages</strong> for child pages and extra non-system routes.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/site-settings"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Open Global Site Settings
            </Link>
            <Link
              href="/main-page"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Open Custom Pages
            </Link>
          </div>
        </div>
      </ComponentCard>

      {selectedClient ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {OPTIONAL_SYSTEM_PAGE_CONFIGS.filter((config) => featuredSlugs.has(config.slug)).map((config) => (
            <ComponentCard key={config.slug} title={`${config.title} /${config.slug}`}>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <p>{config.description}</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Workflow
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Use Site Settings for enable, publish, and header placement. Use this editor entry for page content and SEO setup.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/managed-pages/${config.slug}`}
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
          ))}
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
