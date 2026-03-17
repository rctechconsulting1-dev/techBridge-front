import { NextRequest } from "next/server";
import Stripe from "stripe";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set");
    return Response.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
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
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (apiUrl && session.payment_intent) {
      try {
        await fetch(`${apiUrl}/stripe/charges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stripe_charge_id: String(session.payment_intent),
            amount: session.amount_total,
            currency: session.currency ?? "usd",
            status: session.payment_status,
            stripe_customer_id: null,
          }),
        });
      } catch (err) {
        // Log but don't fail — Stripe will retry if we return non-200
        console.error("[stripe/webhook] Failed to record charge:", err);
      }
    }
  }

  return Response.json({ received: true });
}
