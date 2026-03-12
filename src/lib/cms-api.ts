/**
 * CMS API client for the landing page template.
 * All fetches use ISR (next: { revalidate: 60 }) so the page rebuilds
 * every 60 s without a full deployment, and immediately on webhook trigger.
 *
 * Call getToken() / setToken() from cms-auth.ts when making protected (PUT)
 * requests from the admin panel.
 */

import type {
  Website,
  SiteSettings,
  Service,
  Testimonial,
  TeamMember,
  FAQItem,
  Product,
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

/** Fetches all landing page data in parallel — use in page.tsx */
export async function getLandingPageData(
  websiteId: number | string,
): Promise<LandingPageData> {
  const [website, settings, services, testimonials, team, faq] =
    await Promise.all([
      getWebsite(websiteId),
      getSiteSettings(websiteId),
      getServices(websiteId),
      getTestimonials(websiteId),
      getTeamMembers(websiteId),
      getFAQ(websiteId),
    ]);
  return { website, settings, services, testimonials, team, faq };
}

// ─── Protected writes (client-side, admin panel) ────────────────────────────

export async function updateSiteSettings(
  websiteId: number | string,
  data: Partial<SiteSettings>,
): Promise<SiteSettings | null> {
  return cmsPut<SiteSettings>(`/site-settings/${websiteId}`, data);
}
