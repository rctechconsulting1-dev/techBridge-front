import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type React from "react";
import Image from "next/image";
import {
  getPages,
  getPageBySlug,
  getPageImages,
  getSiteSettings,
  getWebsite,
  getServices,
  getTestimonials,
  getFAQ,
} from "@/lib/cms-api";
import NavBar from "@/components/sections/NavBar";
import CTASection from "@/components/sections/CTASection";
import FooterSection from "@/components/sections/FooterSection";
import BlogListSection from "@/components/sections/BlogListSection";
import MarkdownContent from "@/components/common/MarkdownContent";
import {
  getGenericSectionVariants,
  type BlogListSectionVariant,
} from "@/components/sections/sectionVariants";
import LocationPage from "@/components/built-in/location/LocationPage";
import { getPublicCanonicalMetadata, getPublicCanonicalUrl } from "@/lib/public-site-routing";
import { BreadcrumbJsonLd, LocationServiceJsonLd, ArticleJsonLd } from "@/components/seo/JsonLd";

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

function isBlogListVariant(value: string): value is BlogListSectionVariant {
  return ["editorial_grid", "featured_stack", "compact_rows"].includes(value);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { websiteId, slug } = await params;
  const [website, page] = await Promise.all([
    getWebsite(websiteId),
    getPageBySlug(websiteId, slug),
  ]);

  const siteName = website?.name ?? "Our Company";
  const pageTitle = page?.title ?? toReadableTitle(slug);
  const loc = page?.presentation?.locationData;

  const canonicalMetadata = await getPublicCanonicalMetadata(`/${slug}`);

  // Location page gets keyword-rich title + description
  const title = loc
    ? (page?.title ?? `${loc.service} in ${loc.city} | ${siteName}`)
    : `${pageTitle} | ${siteName}`;
  const description = loc
    ? (page?.meta_description ??
        `${siteName} provides professional ${loc.service} in ${loc.city}. ${loc.heroBody ?? ""}`.trim())
    : (page?.meta_description ?? `Learn more about ${pageTitle} at ${siteName}.`);

  return {
    title,
    description,
    ...(!canonicalMetadata.alternates?.canonical && { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description,
      ...canonicalMetadata.openGraph,
    },
    alternates: canonicalMetadata.alternates,
  };
}

export default async function CustomPage({ params }: Props) {
  const { websiteId, slug } = await params;
  const canonicalUrl = await getPublicCanonicalUrl(`/${slug}`);
  const siteBase = canonicalUrl?.replace(new RegExp(`\\/${slug}$`), "") ?? null;
  const [website, settings, pages, page] = await Promise.all([
    getWebsite(websiteId),
    getSiteSettings(websiteId),
    getPages(websiteId),
    getPageBySlug(websiteId, slug),
  ]);

  if (!website || !page) {
    notFound();
  }

  const primary = settings?.primary_color ?? "#CD7F32";
  const cssVars = {
    "--cms-primary": primary,
    "--cms-secondary": settings?.secondary_color ?? "#ffffff",
    "--cms-accent": settings?.accent_color ?? "#0070f3",
    ...(settings?.font_family && { fontFamily: settings.font_family }),
  } as React.CSSProperties;

  // ── Location page branch ───────────────────────────────────────────────
  const loc = page.presentation?.locationData;
  if (page.template_type === "location" && loc) {
    const [services, testimonials, faqItems] = await Promise.all([
      getServices(websiteId),
      getTestimonials(websiteId),
      getFAQ(websiteId),
    ]);

    return (
      <>
        {settings?.font_url && <link rel="stylesheet" href={settings.font_url} />}
        {siteBase && (
          <BreadcrumbJsonLd
            siteBase={siteBase}
            pageTitle={page.title ?? `${loc.service} in ${loc.city}`}
            pageSlug={slug}
          />
        )}
        {siteBase && (
          <LocationServiceJsonLd
            website={website}
            settings={settings}
            loc={loc}
            canonicalUrl={canonicalUrl ?? `${siteBase}/${slug}`}
          />
        )}
        <div style={cssVars}>
          <NavBar
            websiteId={websiteId}
            website={website}
            settings={settings}
            pages={pages}
            variant={getGenericSectionVariants("custom").navBar}
          />
          <LocationPage
            websiteId={websiteId}
            website={website}
            settings={settings}
            loc={loc}
            services={services}
            faq={faqItems}
            testimonials={testimonials}
          />
          <FooterSection
            websiteId={websiteId}
            website={website}
            settings={settings}
            pages={pages}
            variant={getGenericSectionVariants("custom").footer}
          />
        </div>
      </>
    );
  }

  const pageImages = await getPageImages(page.id);
  const chromeVariants = getGenericSectionVariants("custom");
  const childBlogPosts = pages.filter(
    (entry) => entry.is_published && entry.page_type === "blog-post" && entry.parent_id === page.id,
  );
  const fallbackBlogPosts = pages.filter(
    (entry) => entry.is_published && entry.page_type === "blog-post",
  );
  const blogPosts = childBlogPosts.length > 0 ? childBlogPosts : fallbackBlogPosts;
  const blogListVariant =
    typeof page.presentation?.sectionVariants?.blogList === "string" &&
    isBlogListVariant(page.presentation.sectionVariants.blogList)
      ? page.presentation.sectionVariants.blogList
      : "editorial_grid";
  const isBlogListPage = page.template_type === "blog-list" || page.page_type === "blog-category";

  return (
    <>
      {settings?.font_url && <link rel="stylesheet" href={settings.font_url} />}
      {siteBase && (
        <BreadcrumbJsonLd
          siteBase={siteBase}
          pageTitle={page.title ?? toReadableTitle(slug)}
          pageSlug={slug}
        />
      )}
      {/* Article schema for individual blog posts */}
      {(page.page_type === "blog-post" || page.template_type === "blog-post") && canonicalUrl && (
        <ArticleJsonLd
          title={page.title ?? toReadableTitle(slug)}
          description={page.meta_description ?? page.excerpt ?? ""}
          canonicalUrl={canonicalUrl}
          datePublished={page.created_at}
          dateModified={page.updated_at ?? page.created_at}
          authorName={website.name}
          publisherName={website.name}
          publisherLogoUrl={settings?.logo_url ?? undefined}
          imageUrl={page.featured_image_url ?? undefined}
        />
      )}
      <div style={cssVars} className="[scroll-behavior:smooth]">
        <NavBar websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.navBar} />

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
          {isBlogListPage ? (
            <div className="space-y-10">
              {page.content ? (
                <article className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-8 lg:px-10">
                  <MarkdownContent content={page.content} />
                </article>
              ) : null}
              <BlogListSection
                pages={blogPosts}
                settings={settings}
                websiteId={websiteId}
                variant={blogListVariant}
              />
            </div>
          ) : (
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
          )}
        </section>

        <CTASection settings={settings} variant={chromeVariants.cta} />
        <FooterSection websiteId={websiteId} website={website} settings={settings} pages={pages} variant={chromeVariants.footer} />
      </div>
    </>
  );
}
