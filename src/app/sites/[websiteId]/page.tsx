import type { Metadata } from "next";
import type React from "react";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { getLandingPageData } from "@/lib/cms-api";
import {
  getHomePageContent,
  getResolvedBuiltInPresentation,
} from "@/lib/builtInPageContent";
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
import { getGenericSectionVariants } from "@/components/sections/sectionVariants";
import { getPublicCanonicalMetadata, getPublicCanonicalUrl } from "@/lib/public-site-routing";
import { LocalBusinessJsonLd, FAQJsonLd, WebSiteJsonLd } from "@/components/seo/JsonLd";
import { ChatWidget } from "@/components/ai-agent/ChatWidget";

// Revalidate every 60 seconds (ISR). Admin panel can also trigger immediate
// revalidation via POST /api/revalidate with the CMS_REVALIDATION_SECRET header.
export const revalidate = 60;

interface Props {
  params: Promise<{ websiteId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { websiteId } = await params;
  const data = await getLandingPageData(websiteId);
  const siteName = data.website?.name ?? "Welcome";
  const homePageContent = getHomePageContent(
    data.homePageContent,
    data.website,
    data.settings,
  );
  const description =
    data.homePageContent?.seo?.description ??
    homePageContent.heroBody ??
    data.website?.tagline ??
    "";

  const canonicalMetadata = await getPublicCanonicalMetadata("/");

  return {
    title: data.homePageContent?.seo?.title ?? siteName,
    description,
    // Suppress indexing when served from the platform host (no canonical domain yet)
    ...(!canonicalMetadata.alternates?.canonical && { robots: { index: false, follow: false } }),
    openGraph: {
      title: data.homePageContent?.seo?.title ?? siteName,
      description,
      ...(data.settings?.logo_url && { images: [data.settings.logo_url] }),
      ...canonicalMetadata.openGraph,
    },
    alternates: canonicalMetadata.alternates,
  };
}

export default async function SiteLandingPage({ params }: Props) {
  const { websiteId } = await params;
  const data = await getLandingPageData(websiteId);

  if (!data.website) {
    notFound();
  }

  const { website, settings, homePageContent, pages, services, testimonials, team, faq } = data;
  const homeContent = getHomePageContent(homePageContent, website, settings);
  const homePresentation = getResolvedBuiltInPresentation("home", homePageContent);
  const chromeVariants = getGenericSectionVariants("home");

  // Canonical URL for structured data
  const canonicalUrl = await getPublicCanonicalUrl("/");
  const presentationSettings = settings
    ? {
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
      }
    : null;

  // Inject CMS brand colours as CSS custom properties on the root element
  // so all sections can reference var(--cms-primary) etc. in Tailwind JIT.
  const cssVars = {
    "--cms-primary": presentationSettings?.primary_color ?? "#CD7F32",
    "--cms-secondary": presentationSettings?.secondary_color ?? "#ffffff",
    "--cms-accent": presentationSettings?.accent_color ?? "#0070f3",
    ...(presentationSettings?.font_family && {
      fontFamily: presentationSettings.font_family,
    }),
  } as React.CSSProperties;

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
      <HomeProofVariants
        themePack={homePresentation.themePack}
        settings={presentationSettings}
        services={services}
        testimonials={testimonials}
        team={team}
        variant={homePresentation.sectionVariants.proof ?? "star_rating_bar"}
      />
    ),
    servicesPreview: (
      <HomeServicesPreviewVariants
        themePack={homePresentation.themePack}
        services={services}
        settings={presentationSettings}
        variant={homePresentation.sectionVariants.servicesPreview ?? "three_card_grid"}
      />
    ),
    aboutPreview: (
      <TeamSection team={team} settings={presentationSettings} variant={chromeVariants.team} />
    ),
    testimonials: (
      <HomeTestimonialsVariants
        themePack={homePresentation.themePack}
        testimonials={testimonials}
        settings={presentationSettings}
        variant={homePresentation.sectionVariants.testimonials ?? "review_cards"}
      />
    ),
    faq: <FAQSection faq={faq} settings={presentationSettings} variant={chromeVariants.faq} />,
    booking: (
      <BookingSection websiteId={websiteId} settings={presentationSettings} variant={chromeVariants.booking} />
    ),
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
      {presentationSettings?.font_url && (
        <link rel="stylesheet" href={presentationSettings.font_url} />
      )}
      {canonicalUrl && settings && (
        <LocalBusinessJsonLd
          website={website}
          settings={settings}
          services={services}
          testimonials={testimonials}
          canonicalUrl={canonicalUrl}
        />
      )}
      {canonicalUrl && (
        <WebSiteJsonLd siteUrl={canonicalUrl} siteName={website.name} />
      )}
      {faq.length > 0 && <FAQJsonLd items={faq.filter((f) => f.is_published)} />}
      <div style={cssVars} className="[scroll-behavior:smooth]">
        <NavBar
          websiteId={websiteId}
          website={website}
          settings={presentationSettings}
          pages={pages}
          variant={chromeVariants.navBar}
        />
        {homePresentation.sectionOrder.map((slot) => (
          <Fragment key={slot}>{sectionMap[slot] ?? null}</Fragment>
        ))}
        <FooterSection websiteId={websiteId} website={website} settings={presentationSettings} pages={pages} variant={chromeVariants.footer} />
        <ChatWidget websiteId={Number(websiteId)} />
      </div>
    </>
  );
}
