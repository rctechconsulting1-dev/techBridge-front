import { notFound } from "next/navigation";
import Link from "next/link";
import { getSiteSettings } from "@/lib/cms-api";
import FulfillmentStatus from "./FulfillmentStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ websiteId: string; productSlug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

type SessionSummary = {
  paymentStatus: string;
  productName: string | null;
  productSlug: string | null;
  quantity: number | null;
  amountTotal: number | null;
  customerEmail: string | null;
  fulfillmentType: string;
};

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api"
).replace(/\/$/, "");

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: Props) {
  const { websiteId, productSlug } = await params;
  const { session_id } = await searchParams;

  if (!session_id) notFound();

  // Fetch session details from the backend — it holds the correct Stripe key.
  let summary: SessionSummary;
  try {
    const res = await fetch(
      `${BACKEND_URL}/stripe/connect/session-summary?session_id=${encodeURIComponent(session_id)}&website_id=${encodeURIComponent(websiteId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) notFound();
    summary = (await res.json()) as SessionSummary;
  } catch {
    notFound();
  }

  if (summary.paymentStatus !== "paid") notFound();

  // ── Security: verify the productSlug in the URL matches the session metadata ──
  const sessionProductSlug = summary.productSlug;
  if (!sessionProductSlug || sessionProductSlug !== productSlug) notFound();

  const settings = await getSiteSettings(websiteId);
  const primary = settings?.primary_color ?? "#000000";
  const shopHref = `/sites/${websiteId}/shop`;

  const productName = summary.productName ?? "your order";
  const quantity = summary.quantity ?? 1;
  const amountPaid = summary.amountTotal
    ? `$${(summary.amountTotal / 100).toFixed(2)}`
    : null;
  const productDetailHref = `/sites/${websiteId}/shop/${sessionProductSlug}`;
  const isPrintify = summary.fulfillmentType === "printify";
  const customerEmail = summary.customerEmail;

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

        {isPrintify ? (
          <FulfillmentStatus sessionId={session_id} primaryColor={primary} />
        ) : (
          <p className="mb-8 text-sm text-gray-400">
            A confirmation email will be sent to you shortly.
          </p>
        )}

        {/* Order summary */}
        <div className="mx-auto mt-4 mb-6 w-full max-w-xs rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm">
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
              <span className="truncate pl-2 text-gray-700">
                {customerEmail}
              </span>
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
