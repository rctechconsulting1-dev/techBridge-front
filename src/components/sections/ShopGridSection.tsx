import type React from "react";
import Link from "next/link";
import EditableImage from "@/components/ui/EditableImage";
import type { Product, SiteSettings } from "@/lib/cms-types";

interface Props {
  products: Product[];
  settings: SiteSettings | null;
  websiteId: string | number;
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1.5">
      <div
        role="img"
        aria-label={`${rating.toFixed(1)} out of 5 stars`}
        className="flex"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            aria-hidden="true"
            className={`h-3.5 w-3.5 ${
              star <= rounded ? "text-yellow-400" : "text-gray-200"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      {count > 0 && (
        <span className="text-xs text-gray-400" aria-hidden="true">
          ({count})
        </span>
      )}
    </div>
  );
}

export default function ShopGridSection({
  products,
  settings,
  websiteId,
}: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const published = products.filter((p) => p.is_published);

  if (published.length === 0) return null;

  return (
    <section aria-label="Products" className="bg-white py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul
          role="list"
          className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4"
        >
          {published.map((product) => {
            const price = parseFloat(product.price);
            const compareAt = product.compare_at_price
              ? parseFloat(product.compare_at_price)
              : null;
            const onSale = !!(compareAt && compareAt > price);

            return (
              <li key={product.id}>
                <Link
                  href={`/sites/${websiteId}/shop/${product.slug}`}
                  className="group flex flex-col focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                  aria-label={`${product.title}${onSale ? ", on sale" : ""}, $${price.toFixed(2)}`}
                  style={{ outlineColor: primary } as React.CSSProperties}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    {product.image_url ? (
                      <EditableImage
                        src={product.image_url}
                        alt={product.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center"
                        style={{ backgroundColor: `${primary}18` }}
                        aria-hidden="true"
                      >
                        <svg
                          aria-hidden="true"
                          className="h-12 w-12 opacity-30"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{ color: primary }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Sale badge */}
                    {onSale && (
                      <span
                        aria-hidden="true"
                        className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: primary }}
                      >
                        Sale
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="mt-3 flex flex-1 flex-col gap-1 px-0.5">
                    <h2 className="text-sm font-medium text-gray-900 group-hover:underline">
                      {product.title}
                    </h2>

                    {product.review_count > 0 && (
                      <StarRating
                        rating={parseFloat(product.average_rating)}
                        count={product.review_count}
                      />
                    )}

                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: primary }}
                      >
                        ${price.toFixed(2)}
                      </span>
                      {onSale && (
                        <span
                          aria-label={`Original price $${compareAt!.toFixed(2)}`}
                          className="text-xs text-gray-400 line-through"
                        >
                          ${compareAt!.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
