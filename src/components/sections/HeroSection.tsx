"use client";
import Link from "next/link";
import EditableImage from "@/components/ui/EditableImage";
import type { SiteSettings, Website } from "@/lib/cms-types";
import type { HeroSectionVariant } from "@/components/sections/sectionVariants";

interface Props {
  website: Website | null;
  settings: SiteSettings | null;
  variant?: HeroSectionVariant;
}

export default function HeroSection({ website, settings, variant = "centered_overlay" }: Props) {
  const headline = settings?.hero_headline ?? website?.name ?? "Welcome";
  const subheadline = settings?.hero_subheadline ?? website?.tagline ?? "";
  const ctaText = settings?.hero_cta_text ?? "Get Started";
  const ctaUrl = settings?.hero_cta_url ?? "/contact";
  const bgImage = settings?.hero_bg_image_url;
  const primary = settings?.primary_color ?? "#CD7F32";
  const hasImage = !!bgImage;
  const accent = settings?.accent_color ?? "#111827";
  const contactItems = [settings?.contact_phone, settings?.contact_email, settings?.address].filter(Boolean);

  if (variant === "split_spotlight") {
    return (
      <section id="hero" aria-label="Hero" className="relative overflow-hidden bg-[#FCF7F1] py-24 sm:py-28 lg:py-32">
        <div className="absolute inset-x-0 top-0 h-56 opacity-70" aria-hidden="true" style={{ background: `linear-gradient(135deg, ${primary}20 0%, ${accent}12 100%)` }} />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">
          <div>
            {website?.name ? (
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: primary }}>
                {website.name}
              </p>
            ) : null}
            <h1 className="max-w-2xl text-4xl font-bold leading-tight text-gray-900 sm:text-5xl lg:text-6xl">
              {headline}
            </h1>
            {subheadline ? (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
                {subheadline}
              </p>
            ) : null}
            <div className="mt-9 flex flex-wrap gap-4">
              <Link href={ctaUrl} className="rounded-full px-7 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white" style={{ backgroundColor: primary }}>
                {ctaText}
              </Link>
              <Link href="#services" className="rounded-full border px-7 py-3 text-sm font-semibold uppercase tracking-[0.2em]" style={{ borderColor: primary, color: primary }}>
                View Services
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-xl sm:p-8">
            {hasImage ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-gray-100">
                <EditableImage src={bgImage!} alt={headline} fill priority className="object-cover" />
              </div>
            ) : (
              <div className="rounded-[1.5rem] p-8" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)` }}>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/72">Why people convert</p>
                <ul className="mt-6 space-y-4 text-base text-white">
                  <li>Clear service framing</li>
                  <li>Fast contact path</li>
                  <li>Trust-first presentation</li>
                </ul>
              </div>
            )}
            {contactItems.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {contactItems.map((item) => (
                  <span key={item} className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "stacked_card") {
    return (
      <section id="hero" aria-label="Hero" className="relative overflow-hidden bg-[#F8F2EA] py-24 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2.5rem] border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur sm:p-12 lg:p-14">
            {website?.name ? (
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: primary }}>
                {website.name}
              </p>
            ) : null}
            <h1 className="max-w-4xl text-4xl font-bold leading-tight text-gray-900 sm:text-5xl lg:text-6xl">
              {headline}
            </h1>
            {subheadline ? (
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-gray-600 sm:text-xl">
                {subheadline}
              </p>
            ) : null}
            <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "Built for clarity",
                  "Made to convert",
                  "Ready for local SEO",
                ].map((item) => (
                  <div key={item} className="rounded-[1.5rem] border border-gray-200 bg-white px-4 py-4 text-sm font-medium text-gray-700">
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                <Link href={ctaUrl} className="rounded-full px-7 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white" style={{ backgroundColor: primary }}>
                  {ctaText}
                </Link>
                <Link href="#services" className="rounded-full border px-7 py-3 text-sm font-semibold uppercase tracking-[0.2em]" style={{ borderColor: primary, color: primary }}>
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="hero"
      aria-label="Hero"
      className="relative flex min-h-screen scroll-mt-20 items-center justify-center overflow-hidden"
      style={{
        backgroundColor: hasImage ? "#111" : "#FDF8F3",
      }}
    >
      {/* Background image */}
      {hasImage && (
        <div className="absolute inset-0 z-0">
          <EditableImage src={bgImage!} alt={headline} fill priority className="object-cover" />
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{
              backgroundColor: settings?.hero_bg_overlay_color ?? "#000000",
              opacity: 0.45,
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-32 text-center sm:px-6 lg:px-8">
        {!website && !settings ? (
          <HeroSkeleton />
        ) : (
          <>
            {/* Eyebrow */}
            {website?.name && (
              <p
                className="mb-6 text-xs font-semibold uppercase tracking-widest"
                style={{ color: hasImage ? "rgba(255,255,255,0.75)" : primary }}
              >
                {website.name}
              </p>
            )}

            {/* Main headline */}
            <h1
              className="mb-4 text-5xl font-bold leading-tight lg:text-7xl"
              style={{ color: hasImage ? "#ffffff" : "#111827" }}
            >
              {headline}
            </h1>

            {/* Subheadline */}
            {subheadline && (
              <p
                className="mx-auto mb-12 max-w-2xl text-xl font-light italic leading-relaxed"
                style={{ color: hasImage ? "rgba(255,255,255,0.85)" : "#6b7280" }}
              >
                {subheadline}
              </p>
            )}

            {/* CTAs */}
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href={ctaUrl}
                className="px-10 py-4 text-sm font-semibold uppercase tracking-widest text-white transition-opacity duration-300 hover:opacity-80"
                style={{ backgroundColor: primary }}
              >
                {ctaText}
              </Link>
              <Link
                href="#services"
                className="border-2 px-10 py-4 text-sm font-semibold uppercase tracking-widest transition-all duration-300"
                style={{
                  borderColor: hasImage ? "#ffffff" : primary,
                  color: hasImage ? "#ffffff" : primary,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = hasImage ? "#ffffff" : primary;
                  e.currentTarget.style.color = hasImage ? primary : "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = hasImage ? "#ffffff" : primary;
                }}
              >
                Learn More
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function HeroSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="mx-auto h-4 w-32 rounded bg-gray-200" />
      <div className="mx-auto h-20 w-3/4 rounded bg-gray-200" />
      <div className="mx-auto h-6 w-2/3 rounded bg-gray-200" />
      <div className="flex justify-center gap-4">
        <div className="h-14 w-40 rounded bg-gray-200" />
        <div className="h-14 w-36 rounded bg-gray-200" />
      </div>
    </div>
  );
}
