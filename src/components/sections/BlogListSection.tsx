import Link from "next/link";
import EditableImage from "@/components/ui/EditableImage";
import type { Page, SiteSettings } from "@/lib/cms-types";
import type { BlogListSectionVariant } from "@/components/sections/sectionVariants";

interface Props {
  pages: Page[];
  settings: SiteSettings | null;
  websiteId: string | number;
  variant?: BlogListSectionVariant;
}

const toExcerpt = (page: Page) => {
  if (page.excerpt?.trim()) {
    return page.excerpt.trim();
  }

  if (!page.content) {
    return "";
  }

  return page.content.replace(/[#*_>`-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
};

export default function BlogListSection({
  pages,
  settings,
  websiteId,
  variant = "editorial_grid",
}: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const publishedPages = pages.filter((page) => page.is_published);

  if (publishedPages.length === 0) {
    return null;
  }

  if (variant === "featured_stack") {
    const [featured, ...rest] = publishedPages;

    return (
      <section id="blog" className="scroll-mt-20 bg-[#FBF6F0] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
                Insights
              </p>
              <h2 className="mt-3 text-4xl font-bold text-gray-900">Latest articles and practical guides</h2>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Link href={`/sites/${websiteId}/${featured.slug}`} className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm transition-transform hover:-translate-y-1">
              <div className="relative aspect-[16/10] bg-gray-100">
                {featured.featured_image_url ? (
                  <EditableImage src={featured.featured_image_url} alt={featured.title} fill className="object-cover" />
                ) : null}
              </div>
              <div className="p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
                  Featured Post
                </p>
                <h3 className="mt-3 text-3xl font-bold text-gray-900">{featured.title}</h3>
                {toExcerpt(featured) ? (
                  <p className="mt-4 text-base leading-relaxed text-gray-600">{toExcerpt(featured)}</p>
                ) : null}
              </div>
            </Link>

            <div className="space-y-4">
              {rest.slice(0, 4).map((page) => (
                <Link key={page.id} href={`/sites/${websiteId}/${page.slug}`} className="block rounded-[1.5rem] border border-gray-200 bg-white p-6 transition-colors hover:border-gray-300">
                  <h3 className="text-xl font-semibold text-gray-900">{page.title}</h3>
                  {toExcerpt(page) ? (
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">{toExcerpt(page)}</p>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "compact_rows") {
    return (
      <section id="blog" className="scroll-mt-20 bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              Blog
            </p>
            <h2 className="mt-3 text-4xl font-bold text-gray-900">Fresh content built for search and trust</h2>
          </div>
          <div className="space-y-4">
            {publishedPages.map((page, index) => (
              <Link key={page.id} href={`/sites/${websiteId}/${page.slug}`} className="grid gap-4 rounded-[1.5rem] border border-gray-200 px-6 py-5 transition-colors hover:border-gray-300 md:grid-cols-[64px_1fr_auto] md:items-center">
                <span className="text-sm font-semibold text-gray-400">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{page.title}</h3>
                  {toExcerpt(page) ? (
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{toExcerpt(page)}</p>
                  ) : null}
                </div>
                <span className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: primary }}>
                  Read
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="blog" className="scroll-mt-20 bg-[#FCF8F3] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
            Blog
          </p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">Publish useful content without looking generic</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {publishedPages.map((page) => (
            <Link key={page.id} href={`/sites/${websiteId}/${page.slug}`} className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm transition-transform hover:-translate-y-1">
              <div className="relative aspect-[4/3] bg-gray-100">
                {page.featured_image_url ? (
                  <EditableImage src={page.featured_image_url} alt={page.title} fill className="object-cover" />
                ) : null}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900">{page.title}</h3>
                {toExcerpt(page) ? (
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{toExcerpt(page)}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}