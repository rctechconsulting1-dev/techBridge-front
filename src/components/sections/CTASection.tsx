"use client";
import Link from "next/link";
import type { SiteSettings } from "@/lib/cms-types";
import type { CTASectionVariant } from "@/components/sections/sectionVariants";

interface Props {
  settings: SiteSettings | null;
  variant?: CTASectionVariant;
}

export default function CTASection({ settings, variant = "solid_banner" }: Props) {
  const headline = settings?.cta_headline;
  const body = settings?.cta_body;
  const buttonText = settings?.cta_button_text;
  const buttonUrl = settings?.cta_button_url ?? "/contact";
  const bgColor =
    settings?.cta_bg_color ??
    settings?.accent_color ??
    settings?.primary_color ??
    "#CD7F32";

  if (!headline && !buttonText) return null;

  if (variant === "split_panel") {
    return (
      <section id="cta" className="scroll-mt-20 bg-[#FBF6F1] py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 rounded-[2.25rem] px-6 py-10 shadow-lg sm:px-10 lg:grid-cols-[1.35fr_auto] lg:items-center lg:px-12" style={{ background: `linear-gradient(135deg, ${bgColor} 0%, ${settings?.accent_color ?? "#111827"} 100%)` }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/72">Ready to move</p>
            {headline ? <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">{headline}</h2> : null}
            {body ? <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/84">{body}</p> : null}
          </div>
          {buttonText ? (
            <div className="flex flex-wrap gap-3">
              <Link href={buttonUrl} className="rounded-full bg-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-900">
                {buttonText}
              </Link>
              <Link href="/contact" className="rounded-full border border-white/60 px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white">
                Talk to Us
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (variant === "minimal_inline") {
    return (
      <section id="cta" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 border-y border-gray-200 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            {headline ? <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{headline}</h2> : null}
            {body ? <p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600">{body}</p> : null}
          </div>
          {buttonText ? (
            <Link href={buttonUrl} className="rounded-full px-7 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white" style={{ backgroundColor: bgColor }}>
              {buttonText}
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      id="cta"
      className="scroll-mt-20 py-24"
      style={{ backgroundColor: bgColor }}
    >
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        {headline && (
          <h2 className="mb-5 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            {headline}
          </h2>
        )}
        {body && (
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed font-light text-white/85 italic">
            {body}
          </p>
        )}
        {buttonText && (
          <Link
            href={buttonUrl}
            className="inline-block border-2 border-white px-10 py-4 text-sm font-semibold tracking-widest text-white uppercase transition-colors duration-300 hover:bg-white"
            style={{ "--hover-color": bgColor } as React.CSSProperties}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = bgColor;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "";
            }}
          >
            {buttonText}
          </Link>
        )}
      </div>
    </section>
  );
}
