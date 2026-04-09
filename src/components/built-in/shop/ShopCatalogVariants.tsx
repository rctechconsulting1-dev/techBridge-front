import Link from "next/link";
import type { BuiltInThemePack, Product, SiteSettings } from "@/lib/cms-types";
import ShopGridSection from "@/components/sections/ShopGridSection";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  products: Product[];
  settings: SiteSettings | null;
  websiteId: string | number;
  emptyStateTitle: string | null;
  emptyStateBody: string | null;
}

export default function ShopCatalogVariants({
  variant,
  themePack,
  products,
  settings,
  websiteId,
  emptyStateTitle,
  emptyStateBody,
}: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const theme = getHomeThemePackStyles(themePack);
  const publishedProducts = products.filter((product) => product.is_published);
  const resolvedEmptyStateTitle = emptyStateTitle ?? "Products coming soon.";

  if (publishedProducts.length === 0) {
    return (
      <section className="py-20 text-center text-gray-400" style={{ backgroundColor: theme.cardBackground }}>
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-lg">{resolvedEmptyStateTitle}</p>
          {emptyStateBody ? <p className="mt-3 text-sm text-gray-500">{emptyStateBody}</p> : null}
        </div>
      </section>
    );
  }

  if (variant === "category_grid") {
    return (
      <section className="py-16" style={{ backgroundColor: theme.softBackground }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-wrap gap-3">
            {["Featured", "Best Sellers", "New Arrivals"].map((label) => (
              <span key={label} className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-gray-700" style={{ backgroundColor: theme.badgeSurface }}>
                {label}
              </span>
            ))}
          </div>
          <ShopGridSection products={publishedProducts} settings={settings} websiteId={websiteId} variant="editorial_cards" />
        </div>
      </section>
    );
  }

  if (variant === "collection_tabs") {
    return (
      <section className="py-16" style={{ backgroundColor: theme.cardBackground }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-wrap gap-3">
            {["Top Picks", "Popular", "Ready to Ship"].map((label) => (
              <button key={label} type="button" className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-gray-700" style={{ backgroundColor: theme.softBackground }}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {publishedProducts.map((product) => (
              <Link key={product.id} href={`/sites/${websiteId}/shop/${product.slug}`} className={`border p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.softBackground, borderColor: `${primary}18` }}>
                <h2 className="text-xl font-semibold text-gray-900">{product.title}</h2>
                {product.description ? <p className="mt-3 text-sm leading-relaxed text-gray-600">{product.description.slice(0, 140)}</p> : null}
                <p className="mt-4 text-sm font-semibold" style={{ color: primary }}>${Number(product.price).toFixed(2)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return <ShopGridSection products={publishedProducts} settings={settings} websiteId={websiteId} variant="product_grid" />;
}