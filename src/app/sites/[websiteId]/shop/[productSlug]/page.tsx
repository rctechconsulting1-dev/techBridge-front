import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditableImage from "@/components/ui/EditableImage";
import { getWebsite, getSiteSettings, getProductBySlug } from "@/lib/cms-api";
import NavBar from "@/components/sections/NavBar";
import FooterSection from "@/components/sections/FooterSection";
import ProductActions from "./ProductActions";

export const revalidate = 60;

interface Props {
  params: Promise<{ websiteId: string; productSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { websiteId, productSlug } = await params;
  const [website, product] = await Promise.all([
    getWebsite(websiteId),
    getProductBySlug(websiteId, productSlug),
  ]);
  if (!website || !product) return {};
  return {
    title: `${product.title} | ${website.name}`,
    description: product.description ?? undefined,
    openGraph: product.image_url
      ? { images: [{ url: product.image_url }] }
      : undefined,
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function ProductDetailPage({ params }: Props) {
  const { websiteId, productSlug } = await params;

  const [website, settings, product] = await Promise.all([
    getWebsite(websiteId),
    getSiteSettings(websiteId),
    getProductBySlug(websiteId, productSlug),
  ]);

  if (!website) notFound();
  if (!settings?.ecommerce_enabled) notFound();
  if (!product || !product.is_published) notFound();

  const primary = settings.primary_color ?? "#000000";
  const secondary = settings.secondary_color ?? "#ffffff";
  const shopHref = `/sites/${websiteId}/shop`;

  const cssVars = {
    "--cms-primary": primary,
    "--cms-secondary": secondary,
    "--cms-accent": settings.accent_color ?? primary,
  } as React.CSSProperties;

  return (
    <div
      style={cssVars}
      className="flex min-h-screen flex-col bg-white font-sans"
    >
      <NavBar websiteId={websiteId} website={website} settings={settings} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex items-center gap-2 text-sm text-gray-500"
        >
          <Link href={`/sites/${websiteId}`} className="hover:underline">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={shopHref} className="hover:underline">
            Shop
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-gray-900">
            {product.title}
          </span>
        </nav>

        {/* Product layout */}
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Image */}
          <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
            {product.image_url ? (
              <EditableImage
                src={product.image_url}
                alt={product.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div
                className="flex h-full items-center justify-center"
                aria-hidden="true"
              >
                <svg
                  aria-hidden="true"
                  className="h-24 w-24 text-gray-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Details — client component handles interactivity */}
          <ProductActions product={product} primary={primary} />
        </div>

        {/* Back link */}
        <div className="mt-14 border-t border-gray-100 pt-8">
          <Link
            href={shopHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:underline"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Shop
          </Link>
        </div>
      </main>

      <FooterSection website={website} settings={settings} />
    </div>
  );
}
