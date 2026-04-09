import Link from "next/link";
import type { BuiltInThemePack, Product, SiteSettings } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  products: Product[];
  settings: SiteSettings | null;
  websiteId: string | number;
}

export default function ShopFeaturedVariants({ variant, themePack, products, settings, websiteId }: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const theme = getHomeThemePackStyles(themePack);
  const featured = products.filter((product) => product.is_published).slice(0, 4);

  if (featured.length === 0) {
    return null;
  }

  if (variant === "offer_panel") {
    const lead = featured[0];
    return (
      <section className="py-16" style={{ backgroundColor: theme.softBackground }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className={`border p-8 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground, borderColor: `${primary}18` }}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>Featured Offer</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900">{lead.title}</h2>
            {lead.description ? <p className="mt-4 text-base leading-relaxed text-gray-600">{lead.description.slice(0, 180)}</p> : null}
            <Link href={`/sites/${websiteId}/shop/${lead.slug}`} className={`mt-6 inline-flex ${theme.buttonRadiusClass} px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white`} style={{ backgroundColor: primary }}>
              Shop Offer
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16" style={{ backgroundColor: variant === "bestseller_strip" ? theme.cardBackground : theme.softBackground }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              {variant === "bestseller_strip" ? "Best Sellers" : "Featured Products"}
            </p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900">Keep the strongest products visible</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {featured.map((product) => (
            <Link key={product.id} href={`/sites/${websiteId}/shop/${product.slug}`} className={`border p-5 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground, borderColor: `${primary}18` }}>
              <h3 className="text-lg font-semibold text-gray-900">{product.title}</h3>
              <p className="mt-3 text-sm font-semibold" style={{ color: primary }}>${Number(product.price).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}