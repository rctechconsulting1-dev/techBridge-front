import type { Metadata } from "next";
import type React from "react";
import { notFound } from "next/navigation";
import { getLandingPageData } from "@/lib/cms-api";
import { getHomePageContent } from "@/lib/builtInPageContent";
import NavBar from "@/components/sections/NavBar";
import HeroSection from "@/components/sections/HeroSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import TeamSection from "@/components/sections/TeamSection";
import FAQSection from "@/components/sections/FAQSection";
import BookingSection from "@/components/sections/BookingSection";
import CTASection from "@/components/sections/CTASection";
import FooterSection from "@/components/sections/FooterSection";

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

  return {
    title: data.homePageContent?.seo?.title ?? siteName,
    description,
    openGraph: {
      title: data.homePageContent?.seo?.title ?? siteName,
      description,
      ...(data.settings?.logo_url && { images: [data.settings.logo_url] }),
    },
  };
}

export default async function SiteLandingPage({ params }: Props) {
  const { websiteId } = await params;
  const data = await getLandingPageData(websiteId);

  if (!data.website) {
    notFound();
  }

  const { website, settings, homePageContent, services, testimonials, team, faq } = data;
  const homeContent = getHomePageContent(homePageContent, website, settings);
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

  return (
    <>
      {presentationSettings?.font_url && (
        <link rel="stylesheet" href={presentationSettings.font_url} />
      )}
      <div style={cssVars} className="[scroll-behavior:smooth]">
        <NavBar
          websiteId={websiteId}
          website={website}
          settings={presentationSettings}
        />
        <HeroSection website={website} settings={presentationSettings} />
        <FeaturesSection services={services} settings={presentationSettings} />
        <TestimonialsSection
          testimonials={testimonials}
          settings={presentationSettings}
        />
        <TeamSection team={team} settings={presentationSettings} />
        <FAQSection faq={faq} settings={presentationSettings} />
        <BookingSection websiteId={websiteId} settings={presentationSettings} />
        <CTASection settings={presentationSettings} />
        <FooterSection website={website} settings={presentationSettings} />
      </div>
    </>
  );
}
