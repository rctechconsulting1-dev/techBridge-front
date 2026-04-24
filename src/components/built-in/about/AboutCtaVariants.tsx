import Link from "next/link";
import CTASection from "@/components/sections/CTASection";
import type { BuiltInThemePack, SiteSettings } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  settings: SiteSettings | null;
}

export default function AboutCtaVariants({ variant, themePack, settings }: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const accent = settings?.accent_color ?? "#111827";
  const theme = getHomeThemePackStyles(themePack);
  const headline = settings?.cta_headline;
  const body = settings?.cta_body;
  const buttonText = settings?.cta_button_text ?? "Get Started";
  const buttonUrl = settings?.cta_button_url ?? "/contact";

  if (variant === "contact_team") {
    return <CTASection settings={settings} variant="split_panel" />;
  }

  if (!headline && !buttonText) {
    return null;
  }

  return (
    <section id="cta" className="scroll-mt-20 py-20" style={{ backgroundColor: theme.cardBackground }}>
      <div className={`mx-auto max-w-6xl px-6 py-10 sm:px-10 lg:px-12 ${theme.panelRadiusClass}`} style={{ background: `linear-gradient(135deg, ${accent} 0%, ${primary} 100%)` }}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              {variant === "book_now" ? "Book a Conversation" : "Consultation CTA"}
            </p>
            {headline ? <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{headline}</h2> : null}
            {body ? <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/84">{body}</p> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={buttonUrl} className={`${theme.buttonRadiusClass} bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-gray-900`}>
              {buttonText}
            </Link>
            <Link href="/contact" className={`${theme.buttonRadiusClass} border border-white/60 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white`}>
              {variant === "book_now" ? "Open Form" : "Talk to Us"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}