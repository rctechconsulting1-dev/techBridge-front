import { notFound } from "next/navigation";
import Link from "next/link";
import Stripe from "stripe";
import { getSiteSettings } from "@/lib/cms-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ websiteId: string; productSlug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: Props) {
  const { websiteId, productSlug } = await params;
  const { session_id } = await searchParams;

  if (!session_id) notFound();

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

  const stripe = new Stripe(stripeKey);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items"],
    });
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
  const amountPaid = session.amount_total
    ? `$${(session.amount_total / 100).toFixed(2)}`
    : null;
  const productDetailHref = `/sites/${websiteId}/shop/${sessionProductSlug}`;

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
        {amountPaid && (
          <p className="mb-6 text-gray-500">
            Amount charged:{" "}
            <strong className="text-gray-700">{amountPaid}</strong>
          </p>
        )}
        <p className="mb-8 text-sm text-gray-400">
          A confirmation email will be sent to you shortly.
        </p>

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
