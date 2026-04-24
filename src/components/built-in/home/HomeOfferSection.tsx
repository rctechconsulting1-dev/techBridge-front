import Link from "next/link";
import type { BuiltInThemePack, HomePageContent, SiteSettings } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  themePack: BuiltInThemePack;
  settings: SiteSettings | null;
  content: Pick<
    HomePageContent,
    "offerHeadline" | "offerBody" | "offerButtonText" | "offerButtonUrl"
  >;
}

export default function HomeOfferSection({ themePack, settings, content }: Props) {
  const headline = content.offerHeadline;
  const body = content.offerBody;
  const buttonText = content.offerButtonText;
  const buttonUrl = content.offerButtonUrl || "/contact";
  const primary = settings?.primary_color ?? "#CD7F32";
  const theme = getHomeThemePackStyles(themePack);

  if (!headline && !body && !buttonText) {
    return null;
  }

  return (
    <section className="py-12" style={{ backgroundColor: theme.softBackground }}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className={`border border-white p-8 shadow-sm sm:p-10 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground }}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
            Featured Offer
          </p>
          {headline ? (
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">{headline}</h2>
          ) : null}
          {body ? (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">{body}</p>
          ) : null}
          <Link
            href={buttonUrl}
            className={`mt-6 inline-flex ${theme.buttonRadiusClass} px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white`}
            style={{ backgroundColor: primary }}
          >
            {buttonText}
          </Link>
        </div>
      </div>
    </section>
  );
}