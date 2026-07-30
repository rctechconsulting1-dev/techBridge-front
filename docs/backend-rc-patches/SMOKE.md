Smoke tests and curl examples

1) Create a prospect and get a Checkout URL

curl -s -X POST http://localhost:5000/api/tenant-prospects \
  -H 'Content-Type: application/json' \
  -d '{"businessName":"Demo Co","ownerName":"Alice","ownerEmail":"alice@example.com","businessType":"lead_gen_services","planKey":"starter"}'

Expect: 201 with JSON `{ tenant: {...}, ownerUser: {...}, checkoutUrl: "https://checkout.stripe.com/..." }`

2) Simulate Checkout success (webhook)
- Use Stripe CLI to forward webhooks: `stripe listen --forward-to localhost:5000/api/stripe/webhook`
- Complete the Checkout session in test mode and ensure webhook `checkout.session.completed` triggers `tenant.payment_confirmed` logic (sets `stripe_subscription_id`, `stripe_customer_id`, `payment_completed_at`).

3) Verify tenant row updated
- Query DB and confirm `stripe_subscription_id` and `payment_completed_at` are set for the tenant created.
