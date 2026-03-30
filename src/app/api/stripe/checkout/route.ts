import { NextRequest } from "next/server";
import { getApiBaseUrl, getRequiredAppBaseUrl } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy request to backend Checkout Session endpoint (Step 6).
 * Product price, stock validation, and Stripe API calls are all handled
 * server-side in the backend — the frontend only supplies routing context.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quantity, websiteId, productSlug } = body as {
      quantity: unknown;
      websiteId: unknown;
      productSlug: unknown;
    };

    if (!quantity || !websiteId || !productSlug) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
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

    // Build success/cancel URLs here since the backend doesn't know the frontend origin.
    const appUrl = getRequiredAppBaseUrl();
    const shopBase = `${appUrl}/sites/${encodeURIComponent(websiteIdString)}/shop/${encodeURIComponent(productSlugString)}`;

    const apiUrl = getApiBaseUrl();
    const backendRes = await fetch(`${apiUrl}/stripe/connect/checkout/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId: Number(websiteIdString),
        productSlug: productSlugString,
        quantity: qty,
        successUrl: `${shopBase}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: shopBase,
      }),
    });

    const data = (await backendRes.json()) as Record<string, unknown>;
    if (!backendRes.ok) {
      return Response.json(
        { error: (data.error as string) || "Failed to create checkout session" },
        { status: backendRes.status },
      );
    }

    return Response.json({ url: data.url, accountScope: data.accountScope });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return Response.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
