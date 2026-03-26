"use client";
import Link from "next/link";
import type { SiteSettings } from "@/lib/cms-types";

interface Props {
  settings: SiteSettings | null;
}

export default function CTASection({ settings }: Props) {
  const headline = settings?.cta_headline;
  const body = settings?.cta_body;
  const buttonText = settings?.cta_button_text;
  const buttonUrl = settings?.cta_button_url ?? "#contact";
  const bgColor =
    settings?.cta_bg_color ??
    settings?.accent_color ??
    settings?.primary_color ??
    "#CD7F32";

  if (!headline && !buttonText) return null;

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
