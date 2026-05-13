import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getSiteSettings } from "@/lib/cms-api";

// Shared metadata defaults for all pages under a tenant site.
// Individual page generateMetadata() overrides conflicting fields.
export const revalidate = 300;

interface Props {
  params: Promise<{ websiteId: string }>;
  children: ReactNode;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}): Promise<Metadata> {
  const { websiteId } = await params;
  const settings = await getSiteSettings(websiteId);

  return {
    // Default Twitter/X card for social sharing – pages can override
    twitter: {
      card: "summary_large_image",
    },
    // Tenant favicon overrides the platform favicon from root layout
    ...(settings?.favicon_url && {
      icons: {
        icon: settings.favicon_url,
        apple: settings.favicon_url,
        shortcut: settings.favicon_url,
      },
    }),
  };
}

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
