import type { MetadataRoute } from "next";
import { getWebsite, getSiteSettings, getPages, getProducts, getBuiltInPageContent } from "@/lib/cms-api";
import { getPublicCanonicalUrl, isPlatformHost } from "@/lib/public-site-routing";

export const revalidate = 300;

interface Props {
  params: Promise<{ websiteId: string }>;
}

export default async function sitemap({ params }: Props): Promise<MetadataRoute.Sitemap> {
  const { websiteId } = await params;

  const [website, settings, pages] = await Promise.all([
    getWebsite(websiteId),
    getSiteSettings(websiteId),
    getPages(websiteId),
  ]);

  const [products, servicesContent, aboutContent] = await Promise.all([
    settings?.ecommerce_enabled ? getProducts(websiteId) : Promise.resolve([]),
    getBuiltInPageContent(websiteId, "services"),
    getBuiltInPageContent(websiteId, "about"),
  ]);

  if (!website) return [];

  // Determine the base URL for this site
  // If we have a canonical domain, use it — otherwise fall back to the platform /sites/ path
  const canonicalBase = await getPublicCanonicalUrl("/");
  const siteBase =
    canonicalBase?.replace(/\/$/, "") ??
    `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://rctechbridge.com"}/sites/${websiteId}`;

  const now = new Date().toISOString();

  const entries: MetadataRoute.Sitemap = [];

  // Home
  entries.push({
    url: `${siteBase}/`,
    lastModified: website.created_at ? new Date(website.created_at) : now,
    changeFrequency: "weekly",
    priority: 1.0,
  });

  // Built-in pages: services, about
  const builtInPages: Array<{ slug: string; content: { updated_at?: string | null } | null }> = [
    { slug: "services", content: servicesContent },
    { slug: "about", content: aboutContent },
  ];
  for (const { slug, content } of builtInPages) {
    entries.push({
      url: `${siteBase}/${slug}`,
      lastModified: content?.updated_at ? new Date(content.updated_at) : now,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  // Shop (if ecommerce enabled)
  if (settings?.ecommerce_enabled) {
    entries.push({
      url: `${siteBase}/shop`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });

    if (Array.isArray(products)) {
      for (const product of products) {
        if (!product.slug || !product.is_published) continue;
        entries.push({
          url: `${siteBase}/shop/${product.slug}`,
          lastModified: product.updated_at ? new Date(product.updated_at) : now,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  }

  // Custom pages (published only)
  // Location pages get a higher priority since they are keyword-targeted landing pages
  const publishedPages = (pages ?? []).filter((p) => p.is_published && p.slug);
  for (const page of publishedPages) {
    const isLocation = page.template_type === "location";
    const isBlogPost = page.page_type === "blog-post" || page.template_type === "blog-post";
    entries.push({
      url: `${siteBase}/${page.slug}`,
      lastModified: page.updated_at ? new Date(page.updated_at) : now,
      changeFrequency: isBlogPost ? "yearly" : "monthly",
      priority: isLocation ? 0.7 : isBlogPost ? 0.5 : 0.6,
    });
  }

  return entries;
}
