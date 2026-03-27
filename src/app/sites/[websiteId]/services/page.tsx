import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type React from "react";
import {
  getBuiltInPageContent,
  getWebsite,
  getSiteSettings,
  getServices,
  getFAQ,
} from "@/lib/cms-api";
import { getServicesPageContent } from "@/lib/builtInPageContent";
import NavBar from "@/components/sections/NavBar";
import FeaturesSection from "@/components/sections/FeaturesSection";
import FAQSection from "@/components/sections/FAQSection";
import BookingSection from "@/components/sections/BookingSection";
import CTASection from "@/components/sections/CTASection";
import FooterSection from "@/components/sections/FooterSection";
import { getPublicCanonicalMetadata } from "@/lib/public-site-routing";

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
  const [website, settings, pageContentRecord, services, faq] = await Promise.all([
    getWebsite(websiteId),
    getSiteSettings(websiteId),
    getBuiltInPageContent(websiteId, "services"),
    getServices(websiteId),
    getFAQ(websiteId),
  ]);

  if (!website) notFound();

  const primary = settings?.primary_color ?? "#CD7F32";
  const pageContent = getServicesPageContent(pageContentRecord, website, settings);

  const cssVars = {
    "--cms-primary": primary,
    "--cms-secondary": settings?.secondary_color ?? "#ffffff",
    "--cms-accent": settings?.accent_color ?? "#0070f3",
    ...(settings?.font_family && { fontFamily: settings.font_family }),
  } as React.CSSProperties;

  return (
    <>
      {settings?.font_url && <link rel="stylesheet" href={settings.font_url} />}
      <div style={cssVars} className="[scroll-behavior:smooth]">
        <NavBar websiteId={websiteId} website={website} settings={settings} />

        {/* Page hero banner */}
        <section
          className="border-b border-gray-100 bg-gray-50 py-16 lg:py-20"
          style={{
            background: `linear-gradient(135deg, ${primary}12, #f9fafb)`,
          }}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className="mb-3 h-1 w-12 rounded-full"
              style={{ backgroundColor: primary }}
            />
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {pageContent.heroTitle ?? "Our Services"}
            </h1>
            <p className="max-w-2xl text-lg text-gray-600">
              {pageContent.heroBody}
            </p>
          </div>
        </section>

        {/* Services grid — reuses existing section component */}
        {services.length > 0 ? (
          <FeaturesSection services={services} settings={settings} />
        ) : (
          <section className="bg-white py-20">
            <div className="mx-auto max-w-3xl px-4 text-center text-gray-400 sm:px-6 lg:px-8">
              <p className="text-lg">{pageContent.emptyStateTitle}</p>
              {pageContent.emptyStateBody && (
                <p className="mt-3 text-sm text-gray-500">
                  {pageContent.emptyStateBody}
                </p>
              )}
            </div>
          </section>
        )}

        {/* FAQ (relevant to services) */}
        <FAQSection faq={faq} settings={settings} />

        {/* Booking */}
        <BookingSection websiteId={websiteId} settings={settings} />

        {/* CTA */}
        <CTASection settings={settings} />

        <FooterSection website={website} settings={settings} />
      </div>
    </>
  );
}
