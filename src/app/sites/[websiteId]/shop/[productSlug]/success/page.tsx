import { notFound } from "next/navigation";
import Link from "next/link";
import Stripe from "stripe";
import { getSiteSettings } from "@/lib/cms-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ websiteId: string; productSlug: string }>;
  searchParams: Promise<{ session_id?: string; account?: string }>;
}

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: Props) {
  const { websiteId, productSlug } = await params;
  const { session_id, account } = await searchParams;

  if (!session_id) notFound();

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

  const stripe = new Stripe(stripeKey);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(
      session_id,
      { expand: ["line_items"] },
      account ? { stripeAccount: account } : undefined,
    );
  } catch {
    notFound();
  }

  if (session.payment_status !== "paid") notFound();

  // ── Security: verify this session belongs to the websiteId in the URL ──
  if (session.metadata?.websiteId !== websiteId) notFound();

  // ── Security: verify the productSlug in the URL matches the session metadata ──
  const sessionProductSlug = session.metadata?.productSlug;
  if (!sessionProductSlug || sessionProductSlug !== productSlug) notFound();

  const settings = await getSiteSettings(websiteId);
  const primary = settings?.primary_color ?? "#000000";
  const shopHref = `/sites/${websiteId}/shop`;

  const lineItem = session.line_items?.data[0];
  const productName = lineItem?.description ?? "your order";
  const quantity = lineItem?.quantity ?? 1;
  const amountPaid = session.amount_total
    ? `$${(session.amount_total / 100).toFixed(2)}`
    : null;
  const productDetailHref = `/sites/${websiteId}/shop/${sessionProductSlug}`;
  const customerEmail = session.customer_details?.email ?? null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-md text-center">
        {/* Check icon */}
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: `${primary}20` }}
          aria-hidden="true"
        >
          <svg
            className="h-8 w-8"
            style={{ color: primary }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Payment successful!
        </h1>
        <p className="mb-1 text-gray-600">
          Thank you for your purchase of{" "}
          <Link
            href={productDetailHref}
            className="font-semibold underline hover:opacity-80"
            style={{ color: primary }}
          >
            {productName}
          </Link>
          .
        </p>

        {/* Order summary */}
        <div className="mx-auto mb-6 mt-4 w-full max-w-xs rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm">
          {amountPaid && (
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold text-gray-800">{amountPaid}</span>
            </div>
          )}
          {quantity > 1 && (
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Qty</span>
              <span className="text-gray-700">{quantity}</span>
            </div>
          )}
          {customerEmail && (
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Receipt to</span>
              <span className="truncate pl-2 text-gray-700">{customerEmail}</span>
            </div>
          )}
        </div>

        {/* What happens next */}
        <div className="mb-8 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-left text-sm text-blue-800">
          <p className="mb-1 font-semibold">What happens next?</p>
          <ul className="list-inside list-disc space-y-1 text-blue-700">
            <li>You&apos;ll receive a receipt at your email shortly.</li>
            <li>The seller will prepare and ship your order.</li>
            <li>Contact the seller if you have any questions.</li>
          </ul>
        </div>

        <Link
          href={shopHref}
          className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ backgroundColor: primary }}
        >
          Back to Shop
        </Link>
      </div>
    </main>
  );
}
