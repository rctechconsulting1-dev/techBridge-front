/**
 * JSON-LD structured data components for tenant public sites.
 * Rendered as <script type="application/ld+json"> server-side.
 *
 * Covers:
 *  - LocalBusiness (home page)
 *  - FAQPage (pages with FAQ data)
 *  - BreadcrumbList (all inner pages)
 *  - ItemList (services overview)
 *  - LocationService (location pages)
 */

import type { Website, SiteSettings, Service, FAQItem, Testimonial, LocationPagePresentation } from "@/lib/cms-types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LocalBusinessProps {
  website: Website;
  settings: SiteSettings;
  services: Service[];
  testimonials: Testimonial[];
  /** Canonical URL for the home page e.g. https://example.com/ */
  canonicalUrl: string;
}

interface FAQJsonLdProps {
  items: FAQItem[];
}

interface BreadcrumbJsonLdProps {
  /** Canonical base URL e.g. https://example.com */
  siteBase: string;
  /** Page title */
  pageTitle: string;
  /** Page path segment e.g. "about" */
  pageSlug: string;
}

interface ServiceListJsonLdProps {
  services: Service[];
  /** Canonical base URL e.g. https://example.com */
  siteBase: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function serializeJsonLd(data: object): string {
  // Sanitize to prevent XSS via </script> injection in data values
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

// ─── LocalBusiness ────────────────────────────────────────────────────────────

export function LocalBusinessJsonLd({
  website,
  settings,
  services,
  testimonials,
  canonicalUrl,
}: LocalBusinessProps) {
  const serviceNames = services
    .filter((s) => s.title)
    .map((s) => s.title);

  const aggregateRating =
    settings.average_rating && settings.review_count && settings.review_count > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: String(settings.average_rating),
          reviewCount: String(settings.review_count),
        }
      : undefined;

  // Build individual Review entries from top testimonials (capped at 5)
  const reviews = testimonials
    .filter((t) => t.is_published && t.star_rating > 0)
    .slice(0, 5)
    .map((t) => ({
      "@type": "Review",
      author: { "@type": "Person", name: t.author_name },
      reviewRating: {
        "@type": "Rating",
        ratingValue: String(t.star_rating),
        bestRating: "5",
      },
      reviewBody: t.quote,
    }));

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: website.name,
    url: canonicalUrl,
    ...(settings.logo_url && { image: settings.logo_url }),
    ...(settings.contact_phone && { telephone: settings.contact_phone }),
    ...(settings.contact_email && { email: settings.contact_email }),
    ...(settings.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: settings.address,
      },
    }),
    ...(website.tagline && { description: website.tagline }),
    ...(serviceNames.length > 0 && { hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: serviceNames.map((name) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name },
      })),
    }}),
    ...(aggregateRating && { aggregateRating }),
    ...(reviews.length > 0 && { review: reviews }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}

// ─── FAQPage ──────────────────────────────────────────────────────────────────

export function FAQJsonLd({ items }: FAQJsonLdProps) {
  if (items.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}

// ─── BreadcrumbList ───────────────────────────────────────────────────────────

export function BreadcrumbJsonLd({ siteBase, pageTitle, pageSlug }: BreadcrumbJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${siteBase}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pageTitle,
        item: `${siteBase}/${pageSlug}`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}

// ─── ItemList (service catalog) ───────────────────────────────────────────────

export function ServiceListJsonLd({ services, siteBase }: ServiceListJsonLdProps) {
  const published = services.filter((s) => s.slug);
  if (published.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: published.map((s, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: s.title,
      url: `${siteBase}/services#${s.slug}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}

// ─── LocationService (location pages) ────────────────────────────────────────

interface LocationServiceProps {
  website: Website;
  settings: SiteSettings | null;
  loc: LocationPagePresentation;
  /** Full canonical URL for this location page */
  canonicalUrl: string;
}

export function LocationServiceJsonLd({ website, settings, loc, canonicalUrl }: LocationServiceProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${loc.service} in ${loc.city}`,
    description: loc.heroBody ?? undefined,
    url: canonicalUrl,
    provider: {
      "@type": "LocalBusiness",
      name: website.name,
      url: canonicalUrl.replace(/\/[^/]+$/, "/"),
      ...(settings?.logo_url && { image: settings.logo_url }),
      ...(settings?.contact_phone && { telephone: settings.contact_phone }),
      ...(settings?.contact_email && { email: settings.contact_email }),
      ...(settings?.address && {
        address: {
          "@type": "PostalAddress",
          streetAddress: settings.address,
        },
      }),
    },
    areaServed: [
      { "@type": "City", name: loc.city },
      ...(loc.nearbyAreas ?? []).map((area) => ({ "@type": "City", name: area })),
    ],
    serviceType: loc.service,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}
