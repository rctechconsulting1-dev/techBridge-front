import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type React from "react";
import {
  getBuiltInPageContent,
  getWebsite,
  getSiteSettings,
  getProducts,
} from "@/lib/cms-api";
import { getShopPageContent } from "@/lib/builtInPageContent";
import NavBar from "@/components/sections/NavBar";
import ShopGridSection from "@/components/sections/ShopGridSection";
import CTASection from "@/components/sections/CTASection";
import FooterSection from "@/components/sections/FooterSection";

export const revalidate = 60;

interface Props {
  params: Promise<{ websiteId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { websiteId } = await params;
  const [website, settings, pageContentRecord] = await Promise.all([
    getWebsite(websiteId),
    getSiteSettings(websiteId),
    getBuiltInPageContent(websiteId, "shop"),
  ]);
  const siteName = website?.name ?? "Our Company";
  return {
    title: pageContentRecord?.seo?.title ?? `Shop | ${siteName}`,
    description:
      pageContentRecord?.seo?.description ?? `Browse products from ${siteName}.`,
    openGraph: {
      title: pageContentRecord?.seo?.title ?? `Shop | ${siteName}`,
      description:
        pageContentRecord?.seo?.description ?? `Browse products from ${siteName}.`,
      ...(settings?.logo_url && { images: [settings.logo_url] }),
    },
  };
}

export default async function ShopPage({ params }: Props) {
  const { websiteId } = await params;
  const [website, settings, pageContentRecord, products] = await Promise.all([
    getWebsite(websiteId),
    getSiteSettings(websiteId),
    getBuiltInPageContent(websiteId, "shop"),
    getProducts(websiteId),
  ]);

  if (!website || !settings?.ecommerce_enabled) notFound();

  const primary = settings?.primary_color ?? "#CD7F32";
  const publishedProducts = products.filter((p) => p.is_published);
  const pageContent = getShopPageContent(pageContentRecord, website);

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

        {/* Page hero */}
        <section
          className="border-b border-gray-100 py-12 lg:py-16"
          style={{
            background: `linear-gradient(135deg, ${primary}12, #f9fafb)`,
          }}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className="mb-3 h-1 w-12 rounded-full"
              style={{ backgroundColor: primary }}
            />
            <h1 className="mb-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {pageContent.heroTitle ?? "Shop"}
            </h1>
            <div className="space-y-2 text-lg text-gray-500">
              {pageContent.heroBody && <p>{pageContent.heroBody}</p>}
              <p>
                {publishedProducts.length} product
                {publishedProducts.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </section>

        {publishedProducts.length > 0 ? (
          <ShopGridSection
            products={products}
            settings={settings}
            websiteId={websiteId}
          />
        ) : (
          <section className="bg-white py-20 text-center text-gray-400">
            <div className="mx-auto max-w-3xl px-4">
              <p className="text-lg">{pageContent.emptyStateTitle}</p>
              {pageContent.emptyStateBody && (
                <p className="mt-3 text-sm text-gray-500">
                  {pageContent.emptyStateBody}
                </p>
              )}
            </div>
          </section>
        )}

        <CTASection settings={settings} />
        <FooterSection website={website} settings={settings} />
      </div>
    </>
  );
}
