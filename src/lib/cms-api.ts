/**
 * CMS API client for the landing page template.
 * All fetches use ISR (next: { revalidate: 60 }) so the page rebuilds
 * every 60 s without a full deployment, and immediately on webhook trigger.
 *
 * Call getToken() / setToken() from cms-auth.ts when making protected (PUT)
 * requests from the admin panel.
 */

import type {
  BuiltInPageContentRecord,
  BuiltInPageKey,
  Website,
  SiteSettings,
  Service,
  Testimonial,
  TeamMember,
  FAQItem,
  Product,
  Page,
  Image,
  LandingPageData,
} from "./cms-types";
import { getApiBaseUrl } from "./api";
import { getToken } from "./cms-auth";
import {
  getWebsiteCacheTag,
  getWebsiteResourceCacheTag,
  SITE_REVALIDATE_SECONDS,
} from "./public-cache";
import { getPublicSiteApiBase, isPlatformHost } from "./public-site-routing";

const BASE_URL = getApiBaseUrl();

async function getServerTenantForwardHeaders(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") {
    return {};
  }

  try {
    const { headers } = await import("next/headers");
    const headerStore = await headers();
    const host =
      headerStore.get("x-forwarded-host") ||
      headerStore.get("host") ||
      null;

    if (!host || isPlatformHost(host)) {
      return {};
    }

    return {
      "x-tenant-domain": host,
      "x-forwarded-proto": headerStore.get("x-forwarded-proto") || "https",
    };
  } catch {
    return {};
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function cmsGet<T>(path: string, serverSide = true): Promise<T | null> {
  try {
    const tenantHeaders = serverSide ? await getServerTenantForwardHeaders() : {};
    const opts: RequestInit = serverSide
      ? {
          next: { revalidate: SITE_REVALIDATE_SECONDS },
          headers: tenantHeaders,
        }
      : { cache: "no-store", headers: tenantHeaders };
    const res = await fetch(`${BASE_URL}${path}`, opts);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

function websiteTags(
  websiteId: number | string,
  resource: string,
  extra: string[] = [],
): string[] {
  return [
    getWebsiteCacheTag(websiteId),
    getWebsiteResourceCacheTag(websiteId, resource),
    ...extra,
  ];
}

async function cmsGetForWebsite<T>(
  websiteId: number | string,
  resource: string,
  path: string,
  serverSide = true,
  extraTags: string[] = [],
): Promise<T | null> {
  try {
    const tenantHeaders = serverSide ? await getServerTenantForwardHeaders() : {};
    const opts: RequestInit = serverSide
      ? {
          next: {
            revalidate: SITE_REVALIDATE_SECONDS,
            tags: websiteTags(websiteId, resource, extraTags),
          },
          headers: tenantHeaders,
        }
      : { cache: "no-store", headers: tenantHeaders };
    const res = await fetch(`${BASE_URL}${path}`, opts);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function cmsPut<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 401) clearTokenOnClient();
      return null;
    }
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

function clearTokenOnClient() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
  }
}

// ─── Public reads (server-side, ISR) ────────────────────────────────────────

export async function getWebsite(
  websiteId: number | string,
): Promise<Website | null> {
  return cmsGetForWebsite<Website>(websiteId, "website", `/websites/${websiteId}`);
}

export async function getSiteSettings(
  websiteId: number | string,
): Promise<SiteSettings | null> {
  return cmsGetForWebsite<SiteSettings>(
    websiteId,
    "site-settings",
    `/site-settings/${websiteId}`,
  );
}

export async function getBuiltInPageContent<K extends BuiltInPageKey>(
  websiteId: number | string,
  pageKey: K,
): Promise<BuiltInPageContentRecord<K> | null> {
  return cmsGetForWebsite<BuiltInPageContentRecord<K>>(
    websiteId,
    `built-in-page:${pageKey}`,
    `/built-in-page-content/${pageKey}?website_id=${websiteId}`,
  );
}

export async function getServices(
  websiteId: number | string,
): Promise<Service[]> {
  return (
    (await cmsGetForWebsite<Service[]>(
      websiteId,
      "services",
      `/services?website_id=${websiteId}`,
    )) ?? []
  );
}

export async function getTestimonials(
  websiteId: number | string,
): Promise<Testimonial[]> {
  return (
    (await cmsGetForWebsite<Testimonial[]>(
      websiteId,
      "testimonials",
      `/testimonials?website_id=${websiteId}`,
    )) ?? []
  );
}

export async function getTeamMembers(
  websiteId: number | string,
): Promise<TeamMember[]> {
  return (
    (await cmsGetForWebsite<TeamMember[]>(
      websiteId,
      "team-members",
      `/team-members?website_id=${websiteId}`,
    )) ?? []
  );
}

export async function getFAQ(websiteId: number | string): Promise<FAQItem[]> {
  return (
    (await cmsGetForWebsite<FAQItem[]>(
      websiteId,
      "faq",
      `/faq?website_id=${websiteId}`,
    )) ?? []
  );
}

export async function getProducts(
  websiteId: number | string,
): Promise<Product[]> {
  return (
    (await cmsGetForWebsite<Product[]>(
      websiteId,
      "products",
      `/products?website_id=${websiteId}`,
    )) ?? []
  );
}

export async function getProductBySlug(
  websiteId: number | string,
  slug: string,
): Promise<Product | null> {
  return cmsGetForWebsite<Product>(
    websiteId,
    "products",
    `/products/slug/${encodeURIComponent(slug)}?website_id=${websiteId}`,
    true,
    [getWebsiteResourceCacheTag(websiteId, `product:${slug.toLowerCase()}`)],
  );
}

export async function getPages(websiteId: number | string): Promise<Page[]> {
  return (
    (await cmsGetForWebsite<Page[]>(
      websiteId,
      "pages",
      `/pages?website_id=${websiteId}`,
    )) ?? []
  );
}

export async function getPageBySlug(
  websiteId: number | string,
  slug: string,
): Promise<Page | null> {
  const publicDirect = await cmsGetForWebsite<{ page?: Page }>(
    websiteId,
    "pages",
    `/public/site/pages/${encodeURIComponent(slug)}?website_id=${websiteId}`,
    true,
    [getWebsiteResourceCacheTag(websiteId, `page:${slug.toLowerCase()}`)],
  );

  if (publicDirect?.page) {
    return publicDirect.page;
  }

  const direct = await cmsGetForWebsite<Page>(
    websiteId,
    "pages",
    `/pages/slug/${encodeURIComponent(slug)}?website_id=${websiteId}`,
    true,
    [getWebsiteResourceCacheTag(websiteId, `page:${slug.toLowerCase()}`)],
  );

  if (direct) {
    return direct.is_published ? direct : null;
  }

  const pages = await getPages(websiteId);
  const normalized = slug.toLowerCase();
  return (
    pages.find((p) => p.slug?.toLowerCase() === normalized && p.is_published) ??
    null
  );
}

type RawPageImage = {
  id?: number;
  image_id?: number | null;
  image?: Image | null;
  url?: string;
  alt_text?: string | null;
  caption?: string | null;
};

export async function getPageImages(pageId: number): Promise<Image[]> {
  const rows =
    (await cmsGet<RawPageImage[]>(`/page-images?page_id=${pageId}`)) ?? [];

  const directImages = rows
    .map((row) => {
      if (row.image && row.image.url) {
        return row.image;
      }

      if (row.url) {
        return {
          id: row.id ?? 0,
          created_at: "",
          url: row.url,
          alt_text: row.alt_text ?? null,
          caption: row.caption ?? null,
        } as Image;
      }

      return null;
    })
    .filter((img): img is Image => !!img);

  if (directImages.length > 0) {
    return directImages;
  }

  const missingImageIds = rows
    .map((row) => row.image_id)
    .filter((id): id is number => typeof id === "number");

  if (missingImageIds.length === 0) {
    return [];
  }

  const fetchedImages = await Promise.all(
    missingImageIds.map((id) => cmsGet<Image>(`/images/${id}`)),
  );

  return fetchedImages.filter((img): img is Image => !!img?.url);
}

/** Fetches all landing page data in parallel — use in page.tsx */
export async function getLandingPageData(
  websiteId: number | string,
): Promise<LandingPageData> {
  const [website, settings, homePageContent, services, testimonials, team, faq] =
    await Promise.all([
      getWebsite(websiteId),
      getSiteSettings(websiteId),
      getBuiltInPageContent(websiteId, "home"),
      getServices(websiteId),
      getTestimonials(websiteId),
      getTeamMembers(websiteId),
      getFAQ(websiteId),
    ]);
  return { website, settings, homePageContent, services, testimonials, team, faq };
}

// ─── Protected writes (client-side, admin panel) ────────────────────────────

export async function updateSiteSettings(
  websiteId: number | string,
  data: Partial<SiteSettings>,
): Promise<SiteSettings | null> {
  return cmsPut<SiteSettings>(`/site-settings/${websiteId}`, data);
}
