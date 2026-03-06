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

  return (
    <section
      id="hero"
      className="relative flex min-h-[80vh] scroll-mt-16 items-center overflow-hidden"
      style={{
        background: bgImage
          ? undefined
          : `linear-gradient(135deg, ${primary}15, #ffffff)`,
      }}
    >
      {/* Background image */}
      {bgImage && (
        <div className="absolute inset-0 z-0">
          <EditableImage src={bgImage} alt={headline} fill priority />
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: settings?.hero_bg_overlay_color ?? "#000000",
              opacity: 0.5,
            }}
          />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {/* Skeleton guard */}
          {!website && !settings ? (
            <HeroSkeleton />
          ) : (
            <>
              <h1
                className="mb-6 text-4xl leading-tight font-bold text-gray-900 sm:text-5xl lg:text-6xl"
                style={{ color: bgImage ? "#fff" : undefined }}
              >
                {headline}
              </h1>
              {subheadline && (
                <p
                  className="mb-10 text-xl leading-relaxed text-gray-600"
                  style={{
                    color: bgImage ? "rgba(255,255,255,0.9)" : undefined,
                  }}
                >
                  {subheadline}
                </p>
              )}
              <div className="flex flex-wrap gap-4">
                <Link
                  href={ctaUrl}
                  className="rounded-lg px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{ backgroundColor: primary }}
                >
                  {ctaText}
                </Link>
                <Link
                  href="#services"
                  className="rounded-lg border-2 px-8 py-4 text-lg font-semibold transition-all duration-300"
                  style={{
                    borderColor: primary,
                    color: bgImage ? "#fff" : primary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = primary;
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = bgImage ? "#fff" : primary;
                  }}
                >
                  Learn More
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function HeroSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-16 w-3/4 rounded-lg bg-gray-200" />
      <div className="space-y-2">
        <div className="h-6 w-full rounded bg-gray-200" />
        <div className="h-6 w-5/6 rounded bg-gray-200" />
      </div>
      <div className="flex gap-4">
        <div className="h-14 w-40 rounded-lg bg-gray-200" />
        <div className="h-14 w-36 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}
