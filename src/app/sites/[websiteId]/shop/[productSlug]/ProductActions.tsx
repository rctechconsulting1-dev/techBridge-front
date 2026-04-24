"use client";

import { useState } from "react";
import type { Product } from "@/lib/cms-types";

interface Props {
  product: Product;
  primary: string;
  websiteId: string;
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-2">
      <div
        role="img"
        aria-label={`${rating.toFixed(1)} out of 5 stars`}
        className="flex"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            aria-hidden="true"
            className={`h-4 w-4 ${
              star <= rounded ? "text-yellow-400" : "text-gray-200"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-gray-500">
        {rating.toFixed(1)} <span aria-hidden="true">({count})</span>
        <span className="sr-only">
          {count} review{count !== 1 ? "s" : ""}
        </span>
      </span>
    </div>
  );
}

export default function ProductActions({ product, primary, websiteId }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = parseFloat(product.price);
  const compareAt = product.compare_at_price
    ? parseFloat(product.compare_at_price)
    : null;
  const inStock = product.stock_quantity > 0;

  const handleBuyNow = async () => {
    if (!inStock || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          websiteId,
          productSlug: product.slug,
        }),
      });
      if (!res.ok) throw new Error("Failed to create checkout session");
      const data = (await res.json()) as { url?: string };
      if (!data.url || !data.url.startsWith("https://checkout.stripe.com/")) {
        throw new Error("Invalid checkout URL");
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("[stripe/checkout]", err);
      setError("Could not start checkout. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">
        {product.title}
      </h1>

      {/* Rating */}
      {product.review_count > 0 && (
        <StarRating
          rating={parseFloat(product.average_rating)}
          count={product.review_count}
        />
      )}

      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span
          className="text-2xl font-bold"
          aria-label={`Price: $${price.toFixed(2)}`}
          style={{ color: primary }}
        >
          ${price.toFixed(2)}
        </span>
        {compareAt && compareAt > price && (
          <span
            aria-label={`Original price: $${compareAt.toFixed(2)}`}
            className="text-lg text-gray-400 line-through"
          >
            ${compareAt.toFixed(2)}
          </span>
        )}
        {compareAt && compareAt > price && (
          <span
            aria-label={`Save $${(compareAt - price).toFixed(2)}`}
            className="rounded px-2 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: primary }}
          >
            Save ${(compareAt - price).toFixed(2)}
          </span>
        )}
      </div>

      {/* Stock */}
      <p
        className={`text-sm font-medium ${inStock ? "text-green-600" : "text-red-500"}`}
      >
        {inStock
          ? `In stock (${product.stock_quantity} available)`
          : "Out of stock"}
      </p>

      {/* Quantity */}
      {inStock && (
        <div
          role="group"
          aria-label="Quantity selector"
          className="flex items-center gap-3"
        >
          <span
            id="qty-label"
            className="text-sm font-medium text-gray-700"
            aria-hidden="true"
          >
            Quantity
          </span>
          <div className="flex items-center border border-gray-300">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-11 w-11 items-center justify-center text-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
            >
              <span aria-hidden="true">−</span>
            </button>
            <span
              className="flex h-11 w-12 items-center justify-center border-x border-gray-300 text-sm font-medium"
              aria-live="polite"
              aria-atomic="true"
              aria-label={`Quantity: ${quantity}`}
            >
              {quantity}
            </span>
            <button
              onClick={() =>
                setQuantity((q) => Math.min(product.stock_quantity, q + 1))
              }
              className="flex h-11 w-11 items-center justify-center text-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
              aria-label="Increase quantity"
              disabled={quantity >= product.stock_quantity}
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Buy Now */}
      <button
        onClick={handleBuyNow}
        disabled={!inStock || loading}
        className="w-full py-4 text-sm font-semibold tracking-widest text-white uppercase transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ backgroundColor: primary }}
        aria-disabled={!inStock || loading}
        aria-busy={loading}
      >
        {loading
          ? "Redirecting to checkout…"
          : inStock
            ? "Buy Now"
            : "Out of Stock"}
      </button>

      {/* Description */}
      {product.description && (
        <div className="border-t border-gray-100 pt-6">
          <h2 className="mb-3 text-sm font-semibold tracking-widest text-gray-500 uppercase">
            Description
          </h2>
          <p className="leading-relaxed whitespace-pre-wrap text-gray-600">
            {product.description}
          </p>
        </div>
      )}
    </div>
  );
}
