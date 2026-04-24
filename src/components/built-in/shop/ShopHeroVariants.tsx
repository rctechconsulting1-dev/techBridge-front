import type { BuiltInThemePack, SiteSettings } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  title: string | null;
  body: string | null;
  productCount: number;
  settings: SiteSettings | null;
}

export default function ShopHeroVariants({ variant, themePack, title, body, productCount, settings }: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const accent = settings?.accent_color ?? "#111827";
  const theme = getHomeThemePackStyles(themePack);
  const resolvedTitle = title ?? "Shop";

  if (variant === "catalog_intro") {
    return (
      <section className="border-b border-gray-100 py-12 lg:py-16" style={{ background: `linear-gradient(135deg, ${primary}12, ${theme.heroBackground})` }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-3 h-1 w-12 rounded-full" style={{ backgroundColor: primary }} />
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">{resolvedTitle}</h1>
          <div className="space-y-2 text-lg text-gray-500">
            {body ? <p>{body}</p> : null}
            <p>{productCount} product{productCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "featured_offer") {
    return (
      <section className="border-b border-gray-100 py-16" style={{ backgroundColor: theme.heroBackground }}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.9fr] lg:px-8">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: primary }}>Featured Collection</p>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">{resolvedTitle}</h1>
            {body ? <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">{body}</p> : null}
          </div>
          <div className={`p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground }}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Merchandising note</p>
            <p className="mt-3 text-lg font-semibold text-gray-900">Lead with hero products, then drive into the full catalog.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-gray-100 py-16" style={{ backgroundColor: theme.heroBackground }}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: primary }}>Seasonal Drop</p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">{resolvedTitle}</h1>
          {body ? <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">{body}</p> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: accent }}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Live catalog</p>
            <p className="mt-3 text-3xl font-bold text-white">{productCount}</p>
          </div>
          <div className={`p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground }}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Conversion focus</p>
            <p className="mt-3 text-lg font-semibold text-gray-900">Make discovery fast, then shorten the path to checkout.</p>
          </div>
        </div>
      </div>
    </section>
  );
}