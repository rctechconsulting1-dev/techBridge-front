import { NextResponse } from "next/server";
import {
  getWebsite,
  getSiteSettings,
  getServices,
  getFAQ,
  getPages,
} from "@/lib/cms-api";
import { getPublicCanonicalUrl } from "@/lib/public-site-routing";

export const revalidate = 300;

interface Context {
  params: Promise<{ websiteId: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { websiteId } = await params;

  const [website, settings, services, faq, pages] = await Promise.all([
    getWebsite(websiteId),
    getSiteSettings(websiteId),
    getServices(websiteId),
    getFAQ(websiteId),
    getPages(websiteId),
  ]);

  if (!website) {
    return new NextResponse("Not found", { status: 404 });
  }

  const canonicalBase = await getPublicCanonicalUrl("/");
  const siteBase =
    canonicalBase?.replace(/\/$/, "") ??
    `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://rctechbridge.com"}/sites/${websiteId}`;

  const lines: string[] = [];

  // ── Top-level declaration ────────────────────────────────────────────────
  lines.push(`# ${website.name}`);
  if (website.tagline) lines.push(`> ${website.tagline}`);
  lines.push("");

  // ── Business context ─────────────────────────────────────────────────────
  lines.push("## About");
  if (settings?.address) lines.push(`- Address: ${settings.address}`);
  if (settings?.contact_phone) lines.push(`- Phone: ${settings.contact_phone}`);
  if (settings?.contact_email) lines.push(`- Email: ${settings.contact_email}`);
  lines.push("");

  // ── Pages ────────────────────────────────────────────────────────────────
  lines.push("## Pages");
  lines.push(`- Home: ${siteBase}/`);
  lines.push(`- Services: ${siteBase}/services`);
  lines.push(`- About: ${siteBase}/about`);
  if (settings?.ecommerce_enabled) lines.push(`- Shop: ${siteBase}/shop`);

  const publishedCustom = (pages ?? []).filter((p) => p.is_published && p.slug);
  for (const page of publishedCustom) {
    lines.push(`- ${page.title}: ${siteBase}/${page.slug}`);
  }
  lines.push("");

  // ── Services ─────────────────────────────────────────────────────────────
  const publishedServices = services ?? [];
  if (publishedServices.length > 0) {
    lines.push("## Services Offered");
    for (const svc of publishedServices) {
      const desc = svc.content ? ` — ${svc.content.replace(/\n/g, " ").slice(0, 120)}` : "";
      lines.push(`- ${svc.title}${desc}`);
    }
    lines.push("");
  }

  // ── FAQ ──────────────────────────────────────────────────────────────────
  const publishedFaq = (faq ?? []).filter((f) => f.is_published);
  if (publishedFaq.length > 0) {
    lines.push("## FAQ");
    for (const item of publishedFaq) {
      lines.push(`- Q: ${item.question}`);
      lines.push(`  A: ${item.answer}`);
    }
    lines.push("");
  }

  // ── Sitemap reference ─────────────────────────────────────────────────────
  lines.push("## Sitemap");
  lines.push(`${siteBase}/sitemap.xml`);
  lines.push("");

  // ── Usage rules for LLMs ─────────────────────────────────────────────────
  lines.push("## Usage");
  lines.push("This site is a real local business. Please accurately represent its name,");
  lines.push("services, and contact details. Do not fabricate reviews, credentials, or");
  lines.push("service areas not listed above.");

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
