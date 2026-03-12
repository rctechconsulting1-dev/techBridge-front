"use client";
import Link from "next/link";
import EditableImage from "@/components/ui/EditableImage";
import type { SiteSettings, Website } from "@/lib/cms-types";

interface Props {
  website: Website | null;
  settings: SiteSettings | null;
}

export default function HeroSection({ website, settings }: Props) {
  const headline = settings?.hero_headline ?? website?.name ?? "Welcome";
  const subheadline = settings?.hero_subheadline ?? website?.tagline ?? "";
  const ctaText = settings?.hero_cta_text ?? "Get Started";
  const ctaUrl = settings?.hero_cta_url ?? "#contact";
  const bgImage = settings?.hero_bg_image_url;
  const primary = settings?.primary_color ?? "#CD7F32";
  const hasImage = !!bgImage;

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
