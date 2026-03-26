import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type React from "react";
import {
  getBuiltInPageContent,
  getWebsite,
  getSiteSettings,
  getTeamMembers,
  getTestimonials,
  getFAQ,
} from "@/lib/cms-api";
import { getAboutPageContent } from "@/lib/builtInPageContent";
import NavBar from "@/components/sections/NavBar";
import TeamSection from "@/components/sections/TeamSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import FAQSection from "@/components/sections/FAQSection";
import BookingSection from "@/components/sections/BookingSection";
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
    getBuiltInPageContent(websiteId, "about"),
  ]);

  const siteName = website?.name ?? "Our Company";
  const pageContent = getAboutPageContent(pageContentRecord, website, settings);

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
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { websiteId } = await params;
  const [website, settings, pageContentRecord, team, testimonials, faq] = await Promise.all([
    getWebsite(websiteId),
    getSiteSettings(websiteId),
    getBuiltInPageContent(websiteId, "about"),
    getTeamMembers(websiteId),
    getTestimonials(websiteId),
    getFAQ(websiteId),
  ]);

  if (!website) notFound();

  const primary = settings?.primary_color ?? "#CD7F32";
  const pageContent = getAboutPageContent(pageContentRecord, website, settings);

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
              {pageContent.heroTitle ?? "About Us"}
            </h1>
            <p className="max-w-2xl text-lg text-gray-600">
              {pageContent.heroBody}
            </p>
          </div>
        </section>

        {/* Mission / company blurb (driven by site settings) */}
        {pageContent.missionBody && (
          <section className="bg-white py-16 lg:py-20">
            <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
              <h2
                className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl"
                style={{ color: primary }}
              >
                {pageContent.missionTitle ?? "Our Mission"}
              </h2>
              <p className="text-lg leading-relaxed text-gray-600">
                {pageContent.missionBody}
              </p>
            </div>
          </section>
        )}

        {/* Team members */}
        {team.length > 0 ? (
          <TeamSection team={team} settings={settings} />
        ) : (
          <section className="bg-white py-20">
            <div className="mx-auto max-w-7xl px-4 text-center text-gray-400 sm:px-6 lg:px-8">
              <p className="text-lg">Team profiles coming soon.</p>
            </div>
          </section>
        )}

        {/* Testimonials */}
        <TestimonialsSection testimonials={testimonials} settings={settings} />

        {/* FAQ */}
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
