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
import { getToken } from "./cms-auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api";

const REVALIDATE = 60; // seconds

// ─── Helpers ────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function cmsGet<T>(path: string, serverSide = true): Promise<T | null> {
  try {
    const opts: RequestInit = serverSide
      ? { next: { revalidate: REVALIDATE } }
      : { cache: "no-store" };
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
  return cmsGet<Website>(`/websites/${websiteId}`);
}

export async function getSiteSettings(
  websiteId: number | string,
): Promise<SiteSettings | null> {
  return cmsGet<SiteSettings>(`/site-settings/${websiteId}`);
}

export async function getBuiltInPageContent<K extends BuiltInPageKey>(
  websiteId: number | string,
  pageKey: K,
): Promise<BuiltInPageContentRecord<K> | null> {
  return cmsGet<BuiltInPageContentRecord<K>>(
    `/built-in-page-content/${pageKey}?website_id=${websiteId}`,
  );
}

export async function getServices(
  websiteId: number | string,
): Promise<Service[]> {
  return (await cmsGet<Service[]>(`/services?website_id=${websiteId}`)) ?? [];
}

export async function getTestimonials(
  websiteId: number | string,
): Promise<Testimonial[]> {
  return (
    (await cmsGet<Testimonial[]>(`/testimonials?website_id=${websiteId}`)) ?? []
  );
}

export async function getTeamMembers(
  websiteId: number | string,
): Promise<TeamMember[]> {
  return (
    (await cmsGet<TeamMember[]>(`/team-members?website_id=${websiteId}`)) ?? []
  );
}

export async function getFAQ(websiteId: number | string): Promise<FAQItem[]> {
  return (await cmsGet<FAQItem[]>(`/faq?website_id=${websiteId}`)) ?? [];
}

export async function getProducts(
  websiteId: number | string,
): Promise<Product[]> {
  return (await cmsGet<Product[]>(`/products?website_id=${websiteId}`)) ?? [];
}

export async function getProductBySlug(
  websiteId: number | string,
  slug: string,
): Promise<Product | null> {
  return cmsGet<Product>(`/products/slug/${slug}?website_id=${websiteId}`);
}

export async function getPages(websiteId: number | string): Promise<Page[]> {
  return (await cmsGet<Page[]>(`/pages?website_id=${websiteId}`)) ?? [];
}

export async function getPageBySlug(
  websiteId: number | string,
  slug: string,
): Promise<Page | null> {
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
