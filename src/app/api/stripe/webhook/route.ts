import { NextRequest } from "next/server";
import Stripe from "stripe";
import { notifyOpsAlert } from "@/lib/ops-alerts";
import { recordFlowMetric } from "@/lib/opsMetrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

type ProcessedWebhookRecord = {
  processedAt: number;
};

const PROCESSED_TTL_MS = 24 * 60 * 60 * 1000;

const getProcessedWebhookStore = (): Map<string, ProcessedWebhookRecord> => {
  const globalWithStore = globalThis as typeof globalThis & {
    __processedStripeWebhooks?: Map<string, ProcessedWebhookRecord>;
  };

  if (!globalWithStore.__processedStripeWebhooks) {
    globalWithStore.__processedStripeWebhooks = new Map<
      string,
      ProcessedWebhookRecord
    >();
  }

  return globalWithStore.__processedStripeWebhooks;
};

const cleanupExpiredProcessedEvents = () => {
  const now = Date.now();
  const store = getProcessedWebhookStore();
  for (const [key, value] of store.entries()) {
    if (now - value.processedAt > PROCESSED_TTL_MS) {
      store.delete(key);
    }
  }
};

const eventKey = (eventId: string, accountId: string | null) =>
  `${eventId}|${accountId ?? "platform"}`;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const recordMetric = (params: {
    success: boolean;
    websiteId?: string | null;
    tenantId?: string | null;
    code?: string;
  }) => {
    recordFlowMetric({
      flow: "payment_webhook",
      success: params.success,
      durationMs: Date.now() - startedAt,
      websiteId: params.websiteId ?? undefined,
      tenantId: params.tenantId ?? undefined,
      code: params.code,
    });
  };

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set");
    await notifyOpsAlert(
      {
        source: "stripe_webhook",
        message: "STRIPE_WEBHOOK_SECRET is missing",
        severity: "error",
      },
      { dedupeKey: "stripe_webhook:missing_secret" },
    );
    recordMetric({ success: false, code: "MISSING_WEBHOOK_SECRET" });
    return Response.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    recordMetric({ success: false, code: "MISSING_SIGNATURE" });
    return Response.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    await notifyOpsAlert(
      {
        source: "stripe_webhook",
        message: "Signature verification failed",
        severity: "warning",
        details: {
          error: err instanceof Error ? err.message : "unknown",
        },
      },
      { dedupeKey: "stripe_webhook:signature_failed" },
    );
    recordMetric({ success: false, code: "INVALID_SIGNATURE" });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  cleanupExpiredProcessedEvents();
  const accountId = event.account ?? null;
  const key = eventKey(event.id, accountId);
  const processedStore = getProcessedWebhookStore();
  if (processedStore.has(key)) {
    recordMetric({ success: true, code: "DUPLICATE_EVENT" });
    return Response.json({ received: true, duplicate: true });
  }

  let hadProcessingFailure = false;
  let failureCode: string | undefined;
  let metricWebsiteId: string | null = null;
  let metricTenantId: string | null = null;

  if (event.type === "checkout.session.completed") {
    // Re-fetch the session so collected_information (including shipping) is
    // populated — the raw webhook event object may not include it.
    // NOTE: shipping_details is not expandable in API ≥ 2025-01; use
    //       collected_information.shipping_details instead.
    const rawSession = event.data.object as Stripe.Checkout.Session;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(
      rawSession.id,
      {},
      accountId ? { stripeAccount: accountId } : undefined,
    );
    metricWebsiteId = session.metadata?.websiteId ?? null;
    metricTenantId = session.metadata?.tenantId ?? null;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      console.error(
        "[stripe/webhook] NEXT_PUBLIC_API_URL is not set; charge not recorded",
      );
      await notifyOpsAlert(
        {
          source: "stripe_webhook",
          message: "NEXT_PUBLIC_API_URL missing; charge cannot be recorded",
          severity: "error",
          details: {
            eventId: event.id,
            eventType: event.type,
          },
        },
        { dedupeKey: "stripe_webhook:missing_api_url" },
      );
      hadProcessingFailure = true;
      failureCode = "MISSING_API_URL";
    } else if (session.payment_intent) {
      try {
        // Resolve the actual Charge id (ch_...) via the PaymentIntent
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id;
        const paymentIntent = await stripe.paymentIntents.retrieve(
          paymentIntentId,
          {},
          accountId ? { stripeAccount: accountId } : undefined,
        );
        const chargeId =
          typeof paymentIntent.latest_charge === "string"
            ? paymentIntent.latest_charge
            : paymentIntent.latest_charge?.id;

        if (!chargeId) {
          console.error(
            "[stripe/webhook] PaymentIntent has no latest_charge; cannot record charge",
            { paymentIntentId },
          );
          await notifyOpsAlert(
            {
              source: "stripe_webhook",
              message: "PaymentIntent has no latest_charge",
              severity: "warning",
              details: {
                eventId: event.id,
                paymentIntentId,
                stripeAccountId: accountId,
              },
            },
            { dedupeKey: "stripe_webhook:missing_latest_charge" },
          );
          hadProcessingFailure = true;
          failureCode = "MISSING_LATEST_CHARGE";
        } else {
          const recordRes = await fetch(`${apiUrl}/stripe/charges`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": event.id,
              "x-internal-key": process.env.INTERNAL_API_KEY ?? "",
            },
            body: JSON.stringify({
              stripe_charge_id: chargeId,
              amount: session.amount_total,
              currency: session.currency ?? "usd",
              status: session.payment_status,
              stripe_customer_id: null,
              stripe_event_id: event.id,
              stripe_account_id: accountId,
              tenant_id: session.metadata?.tenantId ?? null,
              website_id: session.metadata?.websiteId ?? null,
              product_slug: session.metadata?.productSlug ?? null,
              product_id: session.metadata?.productId ?? null,
              quantity: session.metadata?.quantity
                ? parseInt(session.metadata.quantity, 10)
                : 1,
              fulfillment_type: session.metadata?.fulfillmentType ?? "manual",
              stripe_checkout_session_id: session.id,
              // Shipping — collected_information.shipping_details (API ≥ 2025-01).
              ...(() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const s = (session as any).collected_information
                  ?.shipping_details as
                  | {
                      name?: string;
                      address?: {
                        line1?: string;
                        line2?: string;
                        city?: string;
                        state?: string;
                        postal_code?: string;
                        country?: string;
                      };
                    }
                  | undefined;
                return {
                  shipping_name: s?.name ?? null,
                  shipping_address_line1: s?.address?.line1 ?? null,
                  shipping_address_line2: s?.address?.line2 ?? null,
                  shipping_city: s?.address?.city ?? null,
                  shipping_state: s?.address?.state ?? null,
                  shipping_postal_code: s?.address?.postal_code ?? null,
                  shipping_country: s?.address?.country ?? null,
                };
              })(),
            }),
          });

          if (!recordRes.ok && recordRes.status !== 409) {
            const text = await recordRes.text();
            throw new Error(
              `Charge record failed (${recordRes.status}): ${text}`,
            );
          }
        }
      } catch (err) {
        // Log but don't fail — Stripe will retry if we return non-200
        console.error("[stripe/webhook] Failed to record charge:", err);
        await notifyOpsAlert(
          {
            source: "stripe_webhook",
            message: "Failed to record charge",
            severity: "error",
            details: {
              eventId: event.id,
              eventType: event.type,
              stripeAccountId: accountId,
              error: err instanceof Error ? err.message : "unknown",
            },
          },
          { dedupeKey: "stripe_webhook:record_charge_failed" },
        );
        hadProcessingFailure = true;
        failureCode = "RECORD_CHARGE_FAILED";
      }
    }
  }

  processedStore.set(key, { processedAt: Date.now() });
  recordMetric({
    success: !hadProcessingFailure,
    websiteId: metricWebsiteId,
    tenantId: metricTenantId,
    code: failureCode,
  });

  return Response.json({ received: true });
}
