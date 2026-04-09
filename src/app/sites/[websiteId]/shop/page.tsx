import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type React from "react";
import { Fragment } from "react";
import {
  getBuiltInPageContent,
  getPages,
  getWebsite,
  getSiteSettings,
  getProducts,
} from "@/lib/cms-api";
import {
  getResolvedBuiltInPresentation,
  getShopPageContent,
} from "@/lib/builtInPageContent";
import NavBar from "@/components/sections/NavBar";
import FooterSection from "@/components/sections/FooterSection";
import ShopHeroVariants from "@/components/built-in/shop/ShopHeroVariants";
import ShopCatalogVariants from "@/components/built-in/shop/ShopCatalogVariants";
import ShopFeaturedVariants from "@/components/built-in/shop/ShopFeaturedVariants";
import ShopCtaVariants from "@/components/built-in/shop/ShopCtaVariants";
import { getGenericSectionVariants } from "@/components/sections/sectionVariants";
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
    getBuiltInPageContent(websiteId, "shop"),
  ]);
  const siteName = website?.name ?? "Our Company";
  const canonicalMetadata = await getPublicCanonicalMetadata("/shop");
  return {
    title: pageContentRecord?.seo?.title ?? `Shop | ${siteName}`,
    description:
      pageContentRecord?.seo?.description ?? `Browse products from ${siteName}.`,
    openGraph: {
      title: pageContentRecord?.seo?.title ?? `Shop | ${siteName}`,
      description:
        pageContentRecord?.seo?.description ?? `Browse products from ${siteName}.`,
      ...(settings?.logo_url && { images: [settings.logo_url] }),
      ...canonicalMetadata.openGraph,
    },
    alternates: canonicalMetadata.alternates,
  };
}

export default async function ShopPage({ params }: Props) {
  const { websiteId } = await params;
  const [website, settings, pages, pageContentRecord, products] = await Promise.all([
    getWebsite(websiteId),
    getSiteSettings(websiteId),
    getPages(websiteId),
    getBuiltInPageContent(websiteId, "shop"),
    getProducts(websiteId),
  ]);

  if (!website || !settings?.ecommerce_enabled) notFound();

  const primary = settings?.primary_color ?? "#CD7F32";
  const publishedProducts = products.filter((p) => p.is_published);
  const pageContent = getShopPageContent(pageContentRecord, website);
  const presentation = getResolvedBuiltInPresentation("shop", pageContentRecord);
  const chromeVariants = getGenericSectionVariants("shop");

  const cssVars = {
    "--cms-primary": primary,
    "--cms-secondary": settings?.secondary_color ?? "#ffffff",
    "--cms-accent": settings?.accent_color ?? "#0070f3",
    ...(settings?.font_family && { fontFamily: settings.font_family }),
  } as React.CSSProperties;

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
      <ShopCatalogVariants
        variant={presentation.sectionVariants.catalog ?? "product_grid"}
        themePack={presentation.themePack}
        products={publishedProducts}
        settings={settings}
        websiteId={websiteId}
        emptyStateTitle={pageContent.emptyStateTitle}
        emptyStateBody={pageContent.emptyStateBody}
      />
    ),
    featured: (
      <ShopFeaturedVariants
        variant={presentation.sectionVariants.featured ?? "featured_row"}
        themePack={presentation.themePack}
        products={publishedProducts}
        settings={settings}
        websiteId={websiteId}
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

  return (
    <>
      {settings?.font_url && <link rel="stylesheet" href={settings.font_url} />}
      <div style={cssVars} className="[scroll-behavior:smooth]">
        <NavBar websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.navBar} />
        {presentation.sectionOrder.map((slot) => (
          <Fragment key={slot}>{sectionMap[slot] ?? null}</Fragment>
        ))}
        <FooterSection websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.footer} />
      </div>
    </>
  );
}
