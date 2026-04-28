import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type React from "react";
import { Fragment } from "react";
import {
  getBuiltInPageContent,
  getPages,
  getWebsite,
  getSiteSettings,
  getServices,
  getFAQ,
} from "@/lib/cms-api";
import {
  getResolvedBuiltInPresentation,
  getServicesPageContent,
} from "@/lib/builtInPageContent";
import NavBar from "@/components/sections/NavBar";
import BookingSection from "@/components/sections/BookingSection";
import FooterSection from "@/components/sections/FooterSection";
import ServicesHeroVariants from "@/components/built-in/services/ServicesHeroVariants";
import ServicesListVariants from "@/components/built-in/services/ServicesListVariants";
import ServicesFaqVariants from "@/components/built-in/services/ServicesFaqVariants";
import ServicesCtaVariants from "@/components/built-in/services/ServicesCtaVariants";
import { getGenericSectionVariants } from "@/components/sections/sectionVariants";
import { getPublicCanonicalMetadata, getPublicCanonicalUrl } from "@/lib/public-site-routing";
import { BreadcrumbJsonLd, FAQJsonLd, ServiceListJsonLd } from "@/components/seo/JsonLd";

export const revalidate = 60;

interface Props {
  params: Promise<{ websiteId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { websiteId } = await params;
  const [website, settings, pageContentRecord] = await Promise.all([
    getWebsite(websiteId),
    getSiteSettings(websiteId),
    getBuiltInPageContent(websiteId, "services"),
  ]);

  const siteName = website?.name ?? "Our Company";
  const pageContent = getServicesPageContent(pageContentRecord, website, settings);

  const canonicalMetadata = await getPublicCanonicalMetadata("/services");

  return {
    title: pageContentRecord?.seo?.title ?? `Services | ${siteName}`,
    description:
      pageContentRecord?.seo?.description ??
      `Explore the services offered by ${siteName}. ${pageContent.heroBody ?? ""}`.trim(),
    ...(!canonicalMetadata.alternates?.canonical && { robots: { index: false, follow: false } }),
    openGraph: {
      title: pageContentRecord?.seo?.title ?? `Services | ${siteName}`,
      description:
        pageContentRecord?.seo?.description ??
        `Explore the services offered by ${siteName}.`,
      ...(settings?.logo_url && { images: [settings.logo_url] }),
      ...canonicalMetadata.openGraph,
    },
    alternates: canonicalMetadata.alternates,
  };
}

export default async function ServicesPage({ params }: Props) {
  const { websiteId } = await params;
  const canonicalUrl = await getPublicCanonicalUrl("/services");
  const siteBase = canonicalUrl?.replace(/\/services$/, "") ?? null;
  const [website, settings, pages, pageContentRecord, services, faq] = await Promise.all([
    getWebsite(websiteId),
    getSiteSettings(websiteId),
    getPages(websiteId),
    getBuiltInPageContent(websiteId, "services"),
    getServices(websiteId),
    getFAQ(websiteId),
  ]);

  if (!website) notFound();

  const primary = settings?.primary_color ?? "#CD7F32";
  const pageContent = getServicesPageContent(pageContentRecord, website, settings);
  const presentation = getResolvedBuiltInPresentation("services", pageContentRecord);
  const chromeVariants = getGenericSectionVariants("services");

  const cssVars = {
    "--cms-primary": primary,
    "--cms-secondary": settings?.secondary_color ?? "#ffffff",
    "--cms-accent": settings?.accent_color ?? "#0070f3",
    ...(settings?.font_family && { fontFamily: settings.font_family }),
  } as React.CSSProperties;

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
      <ServicesListVariants
        variant={presentation.sectionVariants.servicesList ?? "grid_cards"}
        themePack={presentation.themePack}
        services={services}
        settings={settings}
        emptyStateTitle={pageContent.emptyStateTitle}
        emptyStateBody={pageContent.emptyStateBody}
      />
    ),
    faq: (
      <ServicesFaqVariants
        variant={presentation.sectionVariants.faq ?? "accordion"}
        themePack={presentation.themePack}
        faq={faq}
        settings={settings}
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

  const publishedFaq = faq.filter((f) => f.is_published);

  return (
    <>
      {settings?.font_url && <link rel="stylesheet" href={settings.font_url} />}
      {siteBase && <BreadcrumbJsonLd siteBase={siteBase} pageTitle="Services" pageSlug="services" />}
      {siteBase && services.length > 0 && <ServiceListJsonLd services={services} siteBase={siteBase} />}
      {publishedFaq.length > 0 && <FAQJsonLd items={publishedFaq} />}
      <div style={cssVars} className="[scroll-behavior:smooth]">
        <NavBar websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.navBar} />
        {presentation.sectionOrder.map((slot) => (
          <Fragment key={slot}>{sectionMap[slot] ?? null}</Fragment>
        ))}
        {presentation.conversionMode === "appointment" ? (
          <BookingSection websiteId={websiteId} settings={settings} variant={chromeVariants.booking} />
        ) : null}

        <FooterSection websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.footer} />
      </div>
    </>
  );
}
