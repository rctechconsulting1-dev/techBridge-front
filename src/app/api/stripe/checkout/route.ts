import { NextRequest } from "next/server";
import Stripe from "stripe";
import type { Product } from "@/lib/cms-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return url.replace(/\/$/, "");
}

type StripeTenantContext = {
  tenantId?: string;
  stripeConnectedAccountId?: string;
};

async function fetchStripeTenantContext(
  websiteId: string,
  authHeader: string | null,
): Promise<StripeTenantContext | null> {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api").replace(/\/$/, "");

  // Try a couple of endpoint shapes to remain compatible with backend rollout.
  const candidates = [
    `${apiUrl}/stripe/context?website_id=${encodeURIComponent(websiteId)}`,
    `${apiUrl}/stripe/connect/context?website_id=${encodeURIComponent(websiteId)}`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });
      if (!res.ok) {
        continue;
      }

      const raw = (await res.json()) as Record<string, unknown>;
      const tenantId =
        typeof raw.tenantId === "string"
          ? raw.tenantId
          : typeof raw.tenant_id === "string"
            ? raw.tenant_id
            : undefined;
      const stripeConnectedAccountId =
        typeof raw.stripeConnectedAccountId === "string"
          ? raw.stripeConnectedAccountId
          : typeof raw.stripe_connected_account_id === "string"
            ? raw.stripe_connected_account_id
            : typeof raw.connectedAccountId === "string"
              ? raw.connectedAccountId
              : undefined;

      return {
        tenantId,
        stripeConnectedAccountId,
      };
    } catch {
      // Ignore and try next candidate.
    }
  }

  return null;
}

/** Fetch the authoritative product record directly from the backend — always fresh, never cached. */
async function fetchProduct(
  websiteId: string,
  productSlug: string,
): Promise<Product | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api";
  try {
    const res = await fetch(
      `${apiUrl}/products/slug/${encodeURIComponent(productSlug)}?website_id=${encodeURIComponent(websiteId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as Product;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quantity, websiteId, productSlug } = body as {
      quantity: unknown;
      websiteId: unknown;
      productSlug: unknown;
    };

    if (!quantity || !websiteId || !productSlug) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const qty = parseInt(String(quantity), 10);
    const websiteIdString = String(websiteId);
    const productSlugString = String(productSlug);

    if (!/^\d+$/.test(websiteIdString)) {
      return Response.json({ error: "Invalid websiteId" }, { status: 400 });
    }

    if (isNaN(qty) || qty < 1) {
      return Response.json({ error: "Invalid quantity" }, { status: 400 });
    }

    // ── Security: look up price and stock from the database, never trust the client ──
    const product = await fetchProduct(websiteIdString, productSlugString);
    if (!product || !product.is_published) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    if (String(product.website_id ?? "") !== websiteIdString) {
      return Response.json(
        { error: "Product does not belong to website scope" },
        { status: 403 },
      );
    }

    if (product.stock_quantity < 1) {
      return Response.json(
        { error: "Product is out of stock" },
        { status: 409 },
      );
    }

    // ── Security: cap quantity at actual stock ──
    if (qty > product.stock_quantity) {
      return Response.json(
        { error: `Only ${product.stock_quantity} item(s) available` },
        { status: 409 },
      );
    }

    const priceInCents = Math.round(parseFloat(product.price) * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      return Response.json({ error: "Invalid product price" }, { status: 500 });
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();
    const shopBase = `${appUrl}/sites/${encodeURIComponent(websiteIdString)}/shop/${encodeURIComponent(product.slug)}`;
    const authHeader = request.headers.get("authorization");
    const tenantContext = await fetchStripeTenantContext(websiteIdString, authHeader);
    const stripeAccount = tenantContext?.stripeConnectedAccountId;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: [
        {
          quantity: qty,
          price_data: {
            currency: "usd",
            unit_amount: priceInCents,
            product_data: {
              name: product.title,
              metadata: {
                productId: String(product.id),
                websiteId: websiteIdString,
              },
            },
          },
        },
      ],
      // ── Security: store websiteId in session metadata so the success page can verify ownership ──
      metadata: {
        websiteId: websiteIdString,
        productSlug: product.slug,
        ...(tenantContext?.tenantId ? { tenantId: tenantContext.tenantId } : {}),
        ...(stripeAccount ? { stripeAccountId: stripeAccount } : {}),
      },
      success_url: `${shopBase}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: shopBase,
    };

    const session = await stripe.checkout.sessions.create(
      sessionParams,
      stripeAccount ? { stripeAccount } : undefined,
    );

    return Response.json({
      url: session.url,
      accountScope: stripeAccount ? "connected" : "platform",
    });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return Response.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
