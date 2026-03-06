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
    settings?.cta_bg_color ?? settings?.primary_color ?? "#CD7F32";

  // Don't render if no CTA content is configured
  if (!headline && !buttonText) return null;

  return (
    <section
      id="contact"
      className="scroll-mt-16 py-20 lg:py-28"
      style={{ backgroundColor: bgColor }}
    >
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {headline && (
          <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl">
            {headline}
          </h2>
        )}
        {body && (
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-white/90">
            {body}
          </p>
        )}
        {buttonText && (
          <Link
            href={buttonUrl}
            className="inline-block rounded-lg bg-white px-10 py-4 text-lg font-semibold shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            style={{ color: bgColor }}
          >
            {buttonText}
          </Link>
        )}
      </div>
    </section>
  );
}
