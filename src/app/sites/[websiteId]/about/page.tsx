import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type React from "react";
import { Fragment } from "react";
import {
  getBuiltInPageContent,
  getPages,
  getWebsite,
  getSiteSettings,
  getTeamMembers,
  getTestimonials,
  getFAQ,
} from "@/lib/cms-api";
import {
  getAboutPageContent,
  getResolvedBuiltInPresentation,
} from "@/lib/builtInPageContent";
import NavBar from "@/components/sections/NavBar";
import BookingSection from "@/components/sections/BookingSection";
import FooterSection from "@/components/sections/FooterSection";
import AboutHeroVariants from "@/components/built-in/about/AboutHeroVariants";
import AboutMissionVariants from "@/components/built-in/about/AboutMissionVariants";
import AboutTeamVariants from "@/components/built-in/about/AboutTeamVariants";
import AboutTestimonialsVariants from "@/components/built-in/about/AboutTestimonialsVariants";
import AboutCtaVariants from "@/components/built-in/about/AboutCtaVariants";
import FAQSection from "@/components/sections/FAQSection";
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
    getBuiltInPageContent(websiteId, "about"),
  ]);

  const siteName = website?.name ?? "Our Company";
  const pageContent = getAboutPageContent(pageContentRecord, website, settings);

  const canonicalMetadata = await getPublicCanonicalMetadata("/about");

  return {
    title: pageContentRecord?.seo?.title ?? `About | ${siteName}`,
    description:
      pageContentRecord?.seo?.description ??
      `Learn more about ${siteName} — our team, values, and mission. ${pageContent.heroBody ?? ""}`.trim(),
    openGraph: {
      title: pageContentRecord?.seo?.title ?? `About | ${siteName}`,
      description:
        pageContentRecord?.seo?.description ??
        `Learn more about ${siteName} — our team, values, and mission.`,
      ...(settings?.logo_url && { images: [settings.logo_url] }),
      ...canonicalMetadata.openGraph,
    },
    alternates: canonicalMetadata.alternates,
  };
}

export default async function AboutPage({ params }: Props) {
  const { websiteId } = await params;
  const [website, settings, pages, pageContentRecord, team, testimonials, faq] = await Promise.all([
    getWebsite(websiteId),
    getSiteSettings(websiteId),
    getPages(websiteId),
    getBuiltInPageContent(websiteId, "about"),
    getTeamMembers(websiteId),
    getTestimonials(websiteId),
    getFAQ(websiteId),
  ]);

  if (!website) notFound();

  const primary = settings?.primary_color ?? "#CD7F32";
  const pageContent = getAboutPageContent(pageContentRecord, website, settings);
  const presentation = getResolvedBuiltInPresentation("about", pageContentRecord);
  const chromeVariants = getGenericSectionVariants("about");

  const cssVars = {
    "--cms-primary": primary,
    "--cms-secondary": settings?.secondary_color ?? "#ffffff",
    "--cms-accent": settings?.accent_color ?? "#0070f3",
    ...(settings?.font_family && { fontFamily: settings.font_family }),
  } as React.CSSProperties;

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
      <AboutTeamVariants
        variant={presentation.sectionVariants.team ?? "founder_focus"}
        themePack={presentation.themePack}
        team={team}
        settings={settings}
      />
    ),
    testimonials: (
      <AboutTestimonialsVariants
        variant={presentation.sectionVariants.testimonials ?? "featured_quote"}
        themePack={presentation.themePack}
        testimonials={testimonials}
        settings={settings}
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
      {settings?.font_url && <link rel="stylesheet" href={settings.font_url} />}
      <div style={cssVars} className="[scroll-behavior:smooth]">
        <NavBar websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.navBar} />
        {presentation.sectionOrder.map((slot) => (
          <Fragment key={slot}>{sectionMap[slot] ?? null}</Fragment>
        ))}
        <FAQSection faq={faq} settings={settings} variant={chromeVariants.faq} />
        {presentation.conversionMode === "appointment" ? (
          <BookingSection websiteId={websiteId} settings={settings} variant={chromeVariants.booking} />
        ) : null}

        <FooterSection websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.footer} />
      </div>
    </>
  );
}
