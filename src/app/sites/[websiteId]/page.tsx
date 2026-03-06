import type { Metadata } from "next";
import type React from "react";
import { notFound } from "next/navigation";
import { getLandingPageData } from "@/lib/cms-api";
import NavBar from "@/components/sections/NavBar";
import HeroSection from "@/components/sections/HeroSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import TeamSection from "@/components/sections/TeamSection";
import FAQSection from "@/components/sections/FAQSection";
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
  const description =
    data.settings?.hero_subheadline ?? data.website?.tagline ?? "";

  return {
    title: siteName,
    description,
    openGraph: {
      title: siteName,
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

  const { website, settings, services, testimonials, team, faq } = data;

  // Inject CMS brand colours as CSS custom properties on the root element
  // so all sections can reference var(--cms-primary) etc. in Tailwind JIT.
  const cssVars = {
    "--cms-primary": settings?.primary_color ?? "#CD7F32",
    "--cms-secondary": settings?.secondary_color ?? "#ffffff",
    "--cms-accent": settings?.accent_color ?? "#0070f3",
  } as React.CSSProperties;

  return (
    <div style={cssVars} className="[scroll-behavior:smooth]">
      <NavBar websiteId={websiteId} website={website} settings={settings} />
      <HeroSection website={website} settings={settings} />
      <FeaturesSection services={services} settings={settings} />
      <TestimonialsSection testimonials={testimonials} settings={settings} />
      <TeamSection team={team} settings={settings} />
      <FAQSection faq={faq} settings={settings} />
      <CTASection settings={settings} />
      <FooterSection website={website} settings={settings} />
    </div>
  );
}
