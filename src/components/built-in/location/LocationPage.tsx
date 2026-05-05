import type React from "react";
import Link from "next/link";
import type {
  Website,
  SiteSettings,
  Service,
  FAQItem,
  Testimonial,
  LocationPagePresentation,
} from "@/lib/cms-types";
import MarkdownContent from "@/components/common/MarkdownContent";
import BookingSection from "@/components/sections/BookingSection";

interface Props {
  websiteId: string | number;
  website: Website;
  settings: SiteSettings | null;
  loc: LocationPagePresentation;
  services: Service[];
  faq: FAQItem[];
  testimonials: Testimonial[];
}

export default function LocationPage({
  websiteId,
  website,
  settings,
  loc,
  services,
  faq,
  testimonials,
}: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const secondary = settings?.secondary_color ?? "#ffffff";

  // Filter services relevant to this location page's primary service
  const relatedServices = services.filter(
    (s) =>
      s.slug === loc.serviceSlug ||
      s.title.toLowerCase().includes(loc.service.toLowerCase()),
  );
  const otherServices = services.filter(
    (s) =>
      s.slug !== loc.serviceSlug &&
      !s.title.toLowerCase().includes(loc.service.toLowerCase()),
  );

  const publishedFaq = faq.filter((f) => f.is_published);
  const publishedTestimonials = testimonials
    .filter((t) => t.is_published)
    .slice(0, 3);

  const phone = settings?.contact_phone;
  const ctaHref = phone ? `tel:${phone}` : "#contact";
  const ctaText = phone ? `Call Now: ${phone}` : "Get a Free Estimate";

  return (
    <div className="[scroll-behavior:smooth]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-20 lg:py-28"
        style={{ backgroundColor: primary }}
        aria-label={`${loc.service} in ${loc.city} hero`}
      >
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm opacity-80">
              <span className="text-white/70">Services</span>
              <span className="text-white/50">›</span>
              <span className="font-medium text-white">{loc.city}</span>
            </nav>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              {loc.heroHeadline ?? `${loc.service} in ${loc.city}`}
            </h1>

            {loc.heroBody && (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">
                {loc.heroBody}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-base font-semibold shadow-lg transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: secondary, color: primary }}
                aria-label={ctaText}
              >
                {ctaText}
              </a>
              <Link
                href="#services"
                className="inline-flex items-center justify-center rounded-xl border-2 border-white/60 px-7 py-3.5 text-base font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                Our Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Body Content ────────────────────────────────────────────────── */}
      {loc.bodyContent && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <article className="prose prose-lg max-w-none">
              <MarkdownContent content={loc.bodyContent} />
            </article>
          </div>
        </section>
      )}

      {/* ── Services list ────────────────────────────────────────────────── */}
      {services.length > 0 && (
        <section id="services" className="bg-gray-50 py-16" aria-label="Services offered">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-3 text-3xl font-bold text-gray-900">
              {loc.service} Services in {loc.city}
            </h2>
            <p className="mb-10 text-gray-600">
              {website.name} serves {loc.city} with professional, reliable results.
            </p>

            {/* Primary service first */}
            {relatedServices.length > 0 && (
              <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {relatedServices.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border-2 bg-white p-6 shadow-sm"
                    style={{ borderColor: primary }}
                  >
                    <div
                      className="mb-3 h-1 w-10 rounded-full"
                      style={{ backgroundColor: primary }}
                      aria-hidden="true"
                    />
                    <h3 className="mb-2 text-lg font-bold text-gray-900">{s.title}</h3>
                    {s.content && (
                      <p className="text-sm leading-relaxed text-gray-600">
                        {s.content.replace(/\n/g, " ").slice(0, 150)}
                        {s.content.length > 150 ? "…" : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Other services */}
            {otherServices.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherServices.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <h3 className="mb-1 font-semibold text-gray-800">{s.title}</h3>
                    {s.content && (
                      <p className="text-sm text-gray-600">
                        {s.content.replace(/\n/g, " ").slice(0, 100)}
                        {s.content.length > 100 ? "…" : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Why Us ──────────────────────────────────────────────────────── */}
      {loc.whyUs && (
        <section className="bg-white py-16" aria-label="Why choose us">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Why Choose {website.name} in {loc.city}?
            </h2>
            <div className="prose prose-lg max-w-none text-gray-700">
              <MarkdownContent content={loc.whyUs} />
            </div>
          </div>
        </section>
      )}

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      {publishedTestimonials.length > 0 && (
        <section className="bg-gray-50 py-16" aria-label="Customer reviews">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-3xl font-bold text-gray-900">
              What Our {loc.city} Customers Say
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {publishedTestimonials.map((t) => (
                <blockquote
                  key={t.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div
                    className="mb-3 flex gap-1"
                    role="img"
                    aria-label={`${t.star_rating} out of 5 stars`}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        className="h-4 w-4"
                        fill={i < t.star_rating ? primary : "#E5E7EB"}
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mb-4 text-gray-700">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="text-sm font-semibold text-gray-900">
                    {t.author_name}
                    {t.author_title && (
                      <span className="font-normal text-gray-500"> · {t.author_title}</span>
                    )}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Nearby Areas ─────────────────────────────────────────────────── */}
      {loc.nearbyAreas && loc.nearbyAreas.length > 0 && (
        <section className="bg-white py-12" aria-label="Also serving nearby areas">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Also Serving Nearby Areas
            </h2>
            <div className="flex flex-wrap gap-2">
              {loc.nearbyAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-sm text-gray-700"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      {publishedFaq.length > 0 && (
        <section className="bg-gray-50 py-16" aria-label="Frequently asked questions">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-8 text-3xl font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {publishedFaq.map((item) => (
                <details
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-white open:border-[var(--cms-primary)]"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-base font-semibold text-gray-900 marker:content-none">
                    {item.question}
                    <span className="ml-4 shrink-0 text-gray-400" aria-hidden="true">▾</span>
                  </summary>
                  <div className="border-t border-gray-100 px-6 py-4 text-gray-700">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section
        id="contact"
        className="py-16"
        style={{ backgroundColor: primary }}
        aria-label="Contact and booking"
      >
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-3 text-3xl font-bold text-white">
            {loc.ctaHeadline ?? `Ready for ${loc.service} in ${loc.city}?`}
          </h2>
          {loc.ctaBody && (
            <p className="mb-8 text-lg text-white/85">{loc.ctaBody}</p>
          )}
          <a
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-xl px-8 py-4 text-base font-bold shadow-lg transition hover:opacity-90"
            style={{ backgroundColor: secondary, color: primary }}
          >
            {ctaText}
          </a>
        </div>
      </section>

      {/* ── Booking Form ─────────────────────────────────────────────────── */}
      <BookingSection websiteId={websiteId} settings={settings} />
    </div>
  );
}
