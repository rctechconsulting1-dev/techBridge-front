import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type React from "react";
import Image from "next/image";
import {
  getPageBySlug,
  getPageImages,
  getSiteSettings,
  getWebsite,
} from "@/lib/cms-api";
import NavBar from "@/components/sections/NavBar";
import CTASection from "@/components/sections/CTASection";
import FooterSection from "@/components/sections/FooterSection";
import MarkdownContent from "@/components/common/MarkdownContent";

export const revalidate = 60;

interface Props {
  params: Promise<{ websiteId: string; slug: string }>;
}

function toReadableTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { websiteId, slug } = await params;
  const [website, page] = await Promise.all([
    getWebsite(websiteId),
    getPageBySlug(websiteId, slug),
  ]);

  const siteName = website?.name ?? "Our Company";
  const pageTitle = page?.title ?? toReadableTitle(slug);

  return {
    title: `${pageTitle} | ${siteName}`,
    description:
      page?.meta_description ?? `Learn more about ${pageTitle} at ${siteName}.`,
    openGraph: {
      title: `${pageTitle} | ${siteName}`,
      description: page?.meta_description ?? `Learn more about ${pageTitle}.`,
    },
  };
}

export default async function CustomPage({ params }: Props) {
  const { websiteId, slug } = await params;
  const [website, settings, page] = await Promise.all([
    getWebsite(websiteId),
    getSiteSettings(websiteId),
    getPageBySlug(websiteId, slug),
  ]);

  if (!website || !page) {
    notFound();
  }

  const pageImages = await getPageImages(page.id);

  const primary = settings?.primary_color ?? "#CD7F32";
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

        <section className="border-b border-gray-100 bg-gray-50 py-16 lg:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div
              className="mb-4 h-1.5 w-16 rounded-full"
              style={{ backgroundColor: "var(--cms-primary)" }}
            />
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {page.title ?? toReadableTitle(slug)}
            </h1>
            {page.meta_description && (
              <p className="mt-4 max-w-2xl text-lg text-gray-600">
                {page.meta_description}
              </p>
            )}
          </div>
        </section>

        <section className="bg-white py-14">
          <article className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-8 lg:px-10">
            {page.content ? (
              <div>
                <MarkdownContent content={page.content} />

                {pageImages.length > 0 && (
                  <div className="mt-10">
                    <h2 className="mb-4 text-2xl font-semibold text-gray-900">
                      Gallery
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {pageImages.map((img) => (
                        <figure
                          key={`${img.id}-${img.url}`}
                          className="overflow-hidden rounded-xl border border-gray-200"
                        >
                          <div className="relative aspect-[4/3] w-full bg-gray-100">
                            <Image
                              src={img.url}
                              alt={img.alt_text || page.title || "Page image"}
                              fill
                              className="object-cover"
                            />
                          </div>
                          {img.caption && (
                            <figcaption className="px-3 py-2 text-sm text-gray-600">
                              {img.caption}
                            </figcaption>
                          )}
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">This page has no content yet.</p>
            )}
          </article>
        </section>

        <CTASection settings={settings} />
        <FooterSection website={website} settings={settings} />
      </div>
    </>
  );
}
