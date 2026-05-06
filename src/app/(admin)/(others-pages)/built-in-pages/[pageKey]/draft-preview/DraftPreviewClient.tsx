"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Fragment } from "react";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId, getStoredAuthToken } from "@/lib/auth-context";
import {
  getAboutPageContent,
  getHomePageContent,
  getResolvedBuiltInPresentation,
  getServicesPageContent,
  getShopPageContent,
  BUILT_IN_PAGE_KEYS,
  BUILT_IN_PAGE_LABELS,
  getBuiltInPageDraftPreviewPath,
} from "@/lib/builtInPageContent";
import type {
  BuiltInPageContentRecord,
  BuiltInPageEditorRecord,
  BuiltInPageKey,
  FAQItem,
  Page,
  Product,
  Service,
  SiteSettings,
  TeamMember,
  Testimonial,
  Website,
} from "@/lib/cms-types";
import NavBar from "@/components/sections/NavBar";
import TeamSection from "@/components/sections/TeamSection";
import FAQSection from "@/components/sections/FAQSection";
import BookingSection from "@/components/sections/BookingSection";
import FooterSection from "@/components/sections/FooterSection";
import HomeHeroVariants from "@/components/built-in/home/HomeHeroVariants";
import HomeProofVariants from "@/components/built-in/home/HomeProofVariants";
import HomeServicesPreviewVariants from "@/components/built-in/home/HomeServicesPreviewVariants";
import HomeTestimonialsVariants from "@/components/built-in/home/HomeTestimonialsVariants";
import HomeCtaVariants from "@/components/built-in/home/HomeCtaVariants";
import HomeOfferSection from "@/components/built-in/home/HomeOfferSection";
import ServicesHeroVariants from "@/components/built-in/services/ServicesHeroVariants";
import ServicesListVariants from "@/components/built-in/services/ServicesListVariants";
import ServicesFaqVariants from "@/components/built-in/services/ServicesFaqVariants";
import ServicesCtaVariants from "@/components/built-in/services/ServicesCtaVariants";
import AboutHeroVariants from "@/components/built-in/about/AboutHeroVariants";
import AboutMissionVariants from "@/components/built-in/about/AboutMissionVariants";
import AboutTeamVariants from "@/components/built-in/about/AboutTeamVariants";
import AboutTestimonialsVariants from "@/components/built-in/about/AboutTestimonialsVariants";
import AboutCtaVariants from "@/components/built-in/about/AboutCtaVariants";
import ShopHeroVariants from "@/components/built-in/shop/ShopHeroVariants";
import ShopCatalogVariants from "@/components/built-in/shop/ShopCatalogVariants";
import ShopFeaturedVariants from "@/components/built-in/shop/ShopFeaturedVariants";
import ShopCtaVariants from "@/components/built-in/shop/ShopCtaVariants";
import { getGenericSectionVariants } from "@/components/sections/sectionVariants";

/** Draft-preview-only placeholder shown when a collection-backed section would render null. */
function DraftEmptySlot({ slot, message, manageHref }: { slot: string; message: string; manageHref?: string }) {
  const label = slot.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  return (
    <div className="border-y border-dashed border-amber-300 bg-amber-50/50 px-6 py-10 text-center dark:border-amber-800/50 dark:bg-amber-950/20">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 dark:text-amber-400/70">
        {label}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-amber-700 dark:text-amber-300">
        {message}
      </p>
      {manageHref ? (
        <Link
          href={manageHref}
          className="mt-3 inline-block rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
        >
          Add Content →
        </Link>
      ) : null}
    </div>
  );
}

/** Wraps a section node — if it would render null, shows a draft-only placeholder instead. */
function SlotOrEmpty({
  node,
  slot,
  message,
  manageHref,
}: {
  node: React.ReactNode;
  slot: string;
  message: string;
  manageHref?: string;
}) {
  return <>{node ?? <DraftEmptySlot slot={slot} message={message} manageHref={manageHref} />}</>;
}

type Props = {
  pageKey: BuiltInPageKey;
  websiteId: string;
  tenantId: number | null;
};

type DraftPreviewData = {
  website: Website;
  settings: SiteSettings;
  editorRecord: BuiltInPageEditorRecord<BuiltInPageKey>;
  pages: Page[];
  services: Service[];
  testimonials: Testimonial[];
  team: TeamMember[];
  faq: FAQItem[];
  products: Product[];
};

const getRequestHeaders = (tenantId: number | null): Record<string, string> => {
  const token = getStoredAuthToken();
  const activeTenantId = tenantId ?? getActiveTenantId() ?? null;

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeTenantId ? { "x-tenant-id": String(activeTenantId) } : {}),
  };
};

async function fetchJson<T>(path: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

async function fetchJsonOrFallback<T>(
  path: string,
  headers: Record<string, string>,
  fallback: T,
): Promise<T> {
  try {
    return await fetchJson<T>(path, headers);
  } catch {
    return fallback;
  }
}

export default function DraftPreviewClient({ pageKey, websiteId, tenantId }: Props) {
  const [data, setData] = useState<DraftPreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const headers = getRequestHeaders(tenantId);

        const [website, settings, editorRecord, pages] = await Promise.all([
          fetchJson<Website>(`/websites/${websiteId}`, headers),
          fetchJson<SiteSettings>(`/site-settings/${websiteId}`, headers),
          fetchJson<BuiltInPageEditorRecord<BuiltInPageKey>>(
            `/built-in-page-content/editor/${pageKey}?website_id=${websiteId}`,
            headers,
          ),
          fetchJsonOrFallback<Page[]>(`/pages?website_id=${websiteId}`, headers, []),
        ]);

        const [services, testimonials, team, faq, products] = await Promise.all([
          pageKey === "home" || pageKey === "services"
            ? fetchJsonOrFallback<Service[]>(`/services?website_id=${websiteId}`, headers, [])
            : Promise.resolve([]),
          pageKey === "home" || pageKey === "about"
            ? fetchJsonOrFallback<Testimonial[]>(
                `/testimonials?website_id=${websiteId}`,
                headers,
                [],
              )
            : Promise.resolve([]),
          pageKey === "home" || pageKey === "about"
            ? fetchJsonOrFallback<TeamMember[]>(`/team-members?website_id=${websiteId}`, headers, [])
            : Promise.resolve([]),
          pageKey === "home" || pageKey === "services" || pageKey === "about"
            ? fetchJsonOrFallback<FAQItem[]>(`/faq?website_id=${websiteId}`, headers, [])
            : Promise.resolve([]),
          pageKey === "shop"
            ? fetchJsonOrFallback<Product[]>(`/products?website_id=${websiteId}`, headers, [])
            : Promise.resolve([]),
        ]);

        if (cancelled) {
          return;
        }

        setData({
          website,
          settings,
          editorRecord,
          pages,
          services,
          testimonials,
          team,
          faq,
          products,
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load draft preview.",
          );
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [pageKey, tenantId, websiteId]);

  const presentationBadges = useMemo(() => {
    if (!data) return null;
    const p = data.editorRecord.presentation;
    const formatKey = (key: string) =>
      key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return (
      <div className="border-b border-amber-100 bg-amber-50/60 px-4 py-2 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-700/60 dark:text-amber-400/50">
            Applied:
          </span>
          <span className="rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            Theme: {formatKey(p.themePack)}
          </span>
          <span className="rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            Recipe: {formatKey(p.recipe)}
          </span>
          <span className="rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            Conversion: {formatKey(p.conversionMode)}
          </span>
        </div>
      </div>
    );
  }, [data]);

  const draftNotice = useMemo(
    () => (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Draft Preview</p>
            <p className="mt-1 text-xs uppercase tracking-wide opacity-80">
              {BUILT_IN_PAGE_LABELS[pageKey]} draft rendering
            </p>
          </div>
          <Link
            href={`/built-in-pages/${pageKey}`}
            className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-100 dark:hover:bg-amber-900/40"
          >
            Back to Editor
          </Link>
        </div>
      </div>
    ),
    [pageKey],
  );

  // Rewrites live-site nav hrefs to their draft-preview equivalents so that
  // clicking a nav item while in draft preview stays within the preview context.
  const draftLinkRewriter = useMemo(() => {
    const siteBase = `/sites/${websiteId}`;
    const slugToKey: Record<string, string> = {
      "": "home",
      "/": "home",
      "/services": "services",
      "/about": "about",
      "/shop": "shop",
    };
    return (href: string): string => {
      if (!href.startsWith(siteBase)) return href;
      const slug = href.slice(siteBase.length).split("#")[0] ?? "";
      const anchor = href.includes("#") ? `#${href.split("#")[1]}` : "";
      const key = slugToKey[slug] as string | undefined;
      if (!key || !BUILT_IN_PAGE_KEYS.includes(key as BuiltInPageKey)) return href;
      return `${getBuiltInPageDraftPreviewPath(websiteId, key as BuiltInPageKey, tenantId)}${anchor}`;
    };
  }, [websiteId, tenantId]);

  if (loading) {
    return (
      <>
        {draftNotice}
        <div className="flex min-h-[60vh] items-center justify-center px-6 py-16 text-sm text-gray-600 dark:text-gray-300">
          Loading draft preview...
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        {draftNotice}
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
            <p className="font-semibold">Draft preview could not load</p>
            <p className="mt-2">{error ?? "The preview request failed before the draft could be rendered."}</p>
            <p className="mt-3 text-xs opacity-80">
              This preview now uses the browser session like the editor does. If this still fails, the backend rejected the request itself.
            </p>
          </div>
        </div>
      </>
    );
  }

  const { website, settings, editorRecord, pages, services, testimonials, team, faq, products } = data;

  const previewRecord = {
    ...editorRecord,
    seo: editorRecord.seo,
    content: editorRecord.content,
    presentation: editorRecord.presentation,
  };

  const primary = settings.primary_color ?? "#CD7F32";
  const cssVars = {
    "--cms-primary": primary,
    "--cms-secondary": settings.secondary_color ?? "#ffffff",
    "--cms-accent": settings.accent_color ?? "#0070f3",
    ...(settings.font_family && { fontFamily: settings.font_family }),
  } as React.CSSProperties;

  if (pageKey === "home") {
    const typedPreviewRecord = previewRecord as BuiltInPageContentRecord<"home">;
    const homeContent = getHomePageContent(typedPreviewRecord, website, settings);
    const homePresentation = getResolvedBuiltInPresentation("home", typedPreviewRecord);
    const chromeVariants = getGenericSectionVariants("home");
    const presentationSettings = {
      ...settings,
      hero_headline: homeContent.heroTitle,
      hero_subheadline: homeContent.heroBody,
      hero_cta_text: homeContent.heroPrimaryCtaText ?? settings.hero_cta_text,
      hero_cta_url: homeContent.heroPrimaryCtaUrl ?? settings.hero_cta_url,
      hero_bg_image_url:
        homeContent.heroBackgroundImageUrl ?? settings.hero_bg_image_url,
      hero_bg_overlay_color:
        homeContent.heroBackgroundOverlayColor ?? settings.hero_bg_overlay_color,
      cta_headline: homeContent.ctaHeadline ?? settings.cta_headline,
      cta_body: homeContent.ctaBody ?? settings.cta_body,
      cta_button_text: homeContent.ctaButtonText ?? settings.cta_button_text,
      cta_button_url: homeContent.ctaButtonUrl ?? settings.cta_button_url,
    };

    const sectionMap: Record<string, React.ReactNode> = {
      hero: (
        <HomeHeroVariants
          themePack={homePresentation.themePack}
          website={website}
          settings={presentationSettings}
          variant={homePresentation.sectionVariants.hero ?? "service_area_call"}
          hasServicesPreview={homePresentation.sectionOrder.includes("servicesPreview")}
        />
      ),
      proof: (
        <SlotOrEmpty
          slot="proof"
          message="No review signals or trust data available yet. Add them in Site Settings."
          manageHref="/site-settings?tab=settings"
          node={
            <HomeProofVariants
              themePack={homePresentation.themePack}
              settings={presentationSettings}
              services={services}
              testimonials={testimonials}
              team={team}
              variant={homePresentation.sectionVariants.proof ?? "star_rating_bar"}
            />
          }
        />
      ),
      servicesPreview: (
        <SlotOrEmpty
          slot="servicesPreview"
          message="No published services yet. Add service records to populate this section."
          manageHref="/site-settings?tab=services"
          node={
            <HomeServicesPreviewVariants
              themePack={homePresentation.themePack}
              services={services}
              settings={presentationSettings}
              variant={homePresentation.sectionVariants.servicesPreview ?? "three_card_grid"}
            />
          }
        />
      ),
      aboutPreview: (
        <SlotOrEmpty
          slot="aboutPreview"
          message="No published team members yet. Add team profiles to populate this section."
          manageHref="/site-settings?tab=team"
          node={<TeamSection team={team} settings={presentationSettings} variant={chromeVariants.team} />}
        />
      ),
      testimonials: (
        <SlotOrEmpty
          slot="testimonials"
          message="No published testimonials yet. Add testimonials to populate this section."
          manageHref="/content-testimonials"
          node={
            <HomeTestimonialsVariants
              themePack={homePresentation.themePack}
              testimonials={testimonials}
              settings={presentationSettings}
              variant={homePresentation.sectionVariants.testimonials ?? "review_cards"}
            />
          }
        />
      ),
      faq: (
        <SlotOrEmpty
          slot="faq"
          message="No published FAQ items yet. Add FAQ entries to populate this section."
          manageHref="/content-faq"
          node={<FAQSection faq={faq} settings={presentationSettings} variant={chromeVariants.faq} />}
        />
      ),
      booking: <BookingSection websiteId={websiteId} settings={presentationSettings} variant={chromeVariants.booking} />,
      offer: (
        <HomeOfferSection
          themePack={homePresentation.themePack}
          settings={presentationSettings}
          content={homeContent}
        />
      ),
      cta: (
        <HomeCtaVariants
          themePack={homePresentation.themePack}
          settings={presentationSettings}
          variant={homePresentation.sectionVariants.cta ?? "quote_request"}
        />
      ),
    };

    return (
      <>
        {presentationSettings.font_url && <link rel="stylesheet" href={presentationSettings.font_url} />}
        {draftNotice}
        {presentationBadges}
        <div style={cssVars} className="[scroll-behavior:smooth]">
          <NavBar websiteId={websiteId} website={website} settings={presentationSettings} pages={pages} variant={chromeVariants.navBar} linkRewriter={draftLinkRewriter} />
          {homePresentation.sectionOrder.map((slot) => (
            <Fragment key={slot}>{sectionMap[slot] ?? null}</Fragment>
          ))}
          <FooterSection websiteId={websiteId} website={website} settings={presentationSettings} pages={pages} variant={chromeVariants.footer} linkRewriter={draftLinkRewriter} />
        </div>
      </>
    );
  }

  if (pageKey === "services") {
    const typedPreviewRecord = previewRecord as BuiltInPageContentRecord<"services">;
    const pageContent = getServicesPageContent(typedPreviewRecord, website, settings);
    const presentation = getResolvedBuiltInPresentation("services", typedPreviewRecord);
    const chromeVariants = getGenericSectionVariants("services");
    const sectionMap: Record<string, React.ReactNode> = {
      hero: (
        <ServicesHeroVariants
          variant={presentation.sectionVariants.hero ?? "service_grid_intro"}
          themePack={presentation.themePack}
          title={pageContent.heroTitle}
          body={pageContent.heroBody}
          services={services}
          settings={settings}
        />
      ),
      servicesList: (
        <SlotOrEmpty
          slot="servicesList"
          message="No published services yet. Add service records to populate this section."
          manageHref="/site-settings?tab=services"
          node={
            <ServicesListVariants
              variant={presentation.sectionVariants.servicesList ?? "grid_cards"}
              themePack={presentation.themePack}
              services={services}
              settings={settings}
              emptyStateTitle={pageContent.emptyStateTitle}
              emptyStateBody={pageContent.emptyStateBody}
            />
          }
        />
      ),
      faq: (
        <SlotOrEmpty
          slot="faq"
          message="No published FAQ items yet. Add FAQ entries to populate this section."
          manageHref="/content-faq"
          node={
            <ServicesFaqVariants
              variant={presentation.sectionVariants.faq ?? "accordion"}
              themePack={presentation.themePack}
              faq={faq}
              settings={settings}
            />
          }
        />
      ),
      cta: (
        <ServicesCtaVariants
          variant={presentation.sectionVariants.cta ?? "quote_request"}
          themePack={presentation.themePack}
          settings={settings}
        />
      ),
    };

    return (
      <>
        {settings.font_url && <link rel="stylesheet" href={settings.font_url} />}
        {draftNotice}
        {presentationBadges}
        <div style={cssVars} className="[scroll-behavior:smooth]">
          <NavBar websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.navBar} linkRewriter={draftLinkRewriter} />
          {presentation.sectionOrder.map((slot) => (
            <Fragment key={slot}>{sectionMap[slot] ?? null}</Fragment>
          ))}
          {presentation.conversionMode === "appointment" ? (
            <BookingSection websiteId={websiteId} settings={settings} variant={chromeVariants.booking} />
          ) : null}
          <FooterSection websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.footer} linkRewriter={draftLinkRewriter} />
        </div>
      </>
    );
  }

  if (pageKey === "about") {
    const typedPreviewRecord = previewRecord as BuiltInPageContentRecord<"about">;
    const pageContent = getAboutPageContent(typedPreviewRecord, website, settings);
    const presentation = getResolvedBuiltInPresentation("about", typedPreviewRecord);
    const chromeVariants = getGenericSectionVariants("about");
    const sectionMap: Record<string, React.ReactNode> = {
      hero: (
        <AboutHeroVariants
          variant={presentation.sectionVariants.hero ?? "founder_portrait"}
          themePack={presentation.themePack}
          title={pageContent.heroTitle}
          body={pageContent.heroBody}
          settings={settings}
          team={team}
        />
      ),
      mission: (
        <AboutMissionVariants
          variant={presentation.sectionVariants.mission ?? "story_stack"}
          themePack={presentation.themePack}
          title={pageContent.missionTitle}
          body={pageContent.missionBody}
          settings={settings}
        />
      ),
      team: (
        <SlotOrEmpty
          slot="team"
          message="No published team members yet. Add team profiles to populate this section."
          manageHref="/site-settings?tab=team"
          node={
            <AboutTeamVariants
              variant={presentation.sectionVariants.team ?? "founder_focus"}
              themePack={presentation.themePack}
              team={team}
              settings={settings}
            />
          }
        />
      ),
      testimonials: (
        <SlotOrEmpty
          slot="testimonials"
          message="No published testimonials yet. Add testimonials to populate this section."
          manageHref="/content-testimonials"
          node={
            <AboutTestimonialsVariants
              variant={presentation.sectionVariants.testimonials ?? "featured_quote"}
              themePack={presentation.themePack}
              testimonials={testimonials}
              settings={settings}
            />
          }
        />
      ),
      cta: (
        <AboutCtaVariants
          variant={presentation.sectionVariants.cta ?? "contact_team"}
          themePack={presentation.themePack}
          settings={settings}
        />
      ),
    };

    return (
      <>
        {settings.font_url && <link rel="stylesheet" href={settings.font_url} />}
        {draftNotice}
        {presentationBadges}
        <div style={cssVars} className="[scroll-behavior:smooth]">
          <NavBar websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.navBar} linkRewriter={draftLinkRewriter} />
          {presentation.sectionOrder.map((slot) => (
            <Fragment key={slot}>{sectionMap[slot] ?? null}</Fragment>
          ))}
          <FAQSection faq={faq} settings={settings} variant={chromeVariants.faq} />
          {presentation.conversionMode === "appointment" ? (
            <BookingSection websiteId={websiteId} settings={settings} variant={chromeVariants.booking} />
          ) : null}
          <FooterSection websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.footer} linkRewriter={draftLinkRewriter} />
        </div>
      </>
    );
  }

  const typedPreviewRecord = previewRecord as BuiltInPageContentRecord<"shop">;
  const pageContent = getShopPageContent(typedPreviewRecord, website);
  const presentation = getResolvedBuiltInPresentation("shop", typedPreviewRecord);
  const publishedProducts = products.filter((product) => product.is_published);
  const chromeVariants = getGenericSectionVariants("shop");

  return (
    <>
      {settings.font_url && <link rel="stylesheet" href={settings.font_url} />}
      {draftNotice}
      {presentationBadges}
      <div style={cssVars} className="[scroll-behavior:smooth]">
        <NavBar websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.navBar} linkRewriter={draftLinkRewriter} />
        {presentation.sectionOrder.map((slot) => {
          const sectionMap: Record<string, React.ReactNode> = {
            hero: (
              <ShopHeroVariants
                variant={presentation.sectionVariants.hero ?? "catalog_intro"}
                themePack={presentation.themePack}
                title={pageContent.heroTitle}
                body={pageContent.heroBody}
                productCount={publishedProducts.length}
                settings={settings}
              />
            ),
            catalog: (
              <SlotOrEmpty
                slot="catalog"
                message="No published products yet. Add products to populate the catalog."
                manageHref="/site-settings?tab=shop"
                node={
                  <ShopCatalogVariants
                    variant={presentation.sectionVariants.catalog ?? "product_grid"}
                    themePack={presentation.themePack}
                    products={publishedProducts}
                    settings={settings}
                    websiteId={websiteId}
                    emptyStateTitle={pageContent.emptyStateTitle}
                    emptyStateBody={pageContent.emptyStateBody}
                  />
                }
              />
            ),
            featured: (
              <SlotOrEmpty
                slot="featured"
                message="No published products yet. Add products to show featured items."
                manageHref="/site-settings?tab=shop"
                node={
                  <ShopFeaturedVariants
                    variant={presentation.sectionVariants.featured ?? "featured_row"}
                    themePack={presentation.themePack}
                    products={publishedProducts}
                    settings={settings}
                    websiteId={websiteId}
                  />
                }
              />
            ),
            cta: (
              <ShopCtaVariants
                variant={presentation.sectionVariants.cta ?? "shop_now"}
                themePack={presentation.themePack}
                settings={settings}
              />
            ),
          };

          return <Fragment key={slot}>{sectionMap[slot] ?? null}</Fragment>;
        })}
        <FooterSection websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.footer} linkRewriter={draftLinkRewriter} />
      </div>
    </>
  );
}