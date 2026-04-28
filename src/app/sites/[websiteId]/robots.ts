import type { MetadataRoute } from "next";
import { getWebsite } from "@/lib/cms-api";
import { getPublicCanonicalUrl } from "@/lib/public-site-routing";

export const revalidate = 3600;

interface Props {
  params: Promise<{ websiteId: string }>;
}

export default async function robots({ params }: Props): Promise<MetadataRoute.Robots> {
  const { websiteId } = await params;

  const website = await getWebsite(websiteId);
  if (!website) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  // Determine the canonical sitemap URL for this site
  const canonicalBase = await getPublicCanonicalUrl("/");
  const siteBase =
    canonicalBase?.replace(/\/$/, "") ??
    `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://rctechbridge.com"}/sites/${websiteId}`;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Prevent crawling of draft previews and admin paths if somehow reached
        disallow: ["/draft-preview", "/_next/"],
      },
    ],
    sitemap: `${siteBase}/sitemap.xml`,
  };
}
