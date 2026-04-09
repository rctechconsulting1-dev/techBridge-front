import type { BuiltInThemePack, Service, SiteSettings } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  title: string | null;
  body: string | null;
  services: Service[];
  settings: SiteSettings | null;
}

export default function ServicesHeroVariants({
  variant,
  themePack,
  title,
  body,
  services,
  settings,
}: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const accent = settings?.accent_color ?? "#111827";
  const theme = getHomeThemePackStyles(themePack);
  const resolvedTitle = title ?? "Our Services";

  if (variant === "service_grid_intro") {
    return (
      <section
        className="border-b border-gray-100 py-16 lg:py-20"
        style={{ background: `linear-gradient(135deg, ${primary}12, ${theme.heroBackground})` }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-3 h-1 w-12 rounded-full" style={{ backgroundColor: primary }} />
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {resolvedTitle}
          </h1>
          {body ? <p className="max-w-2xl text-lg text-gray-600">{body}</p> : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-gray-700" style={{ backgroundColor: theme.badgeSurface }}>
              {services.length} services published
            </span>
            <span className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-gray-700" style={{ backgroundColor: theme.badgeSurface }}>
              Conversion ready
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "category_overview") {
    return (
      <section className="border-b border-gray-100 py-16 lg:py-24" style={{ backgroundColor: theme.heroBackground }}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[1.3fr_0.8fr] lg:px-8">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: primary }}>
              Service Overview
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">{resolvedTitle}</h1>
            {body ? <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">{body}</p> : null}
          </div>
          <div className={`border p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground, borderColor: `${accent}18` }}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
              This page is best for
            </p>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li>Clear service grouping</li>
              <li>Faster scanability for broader offers</li>
              <li>Direct CTA paths into contact or booking</li>
            </ul>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-gray-100 py-16 lg:py-24" style={{ backgroundColor: theme.heroBackground }}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: primary }}>
            Problem to Solution
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">{resolvedTitle}</h1>
          {body ? <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">{body}</p> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground }}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Common problem</p>
            <p className="mt-3 text-lg font-semibold text-gray-900">Visitors need to know the exact fit fast.</p>
          </div>
          <div className={`p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground }}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Page response</p>
            <p className="mt-3 text-lg font-semibold text-gray-900">Each section frames the service outcome and next action clearly.</p>
          </div>
        </div>
      </div>
    </section>
  );
}