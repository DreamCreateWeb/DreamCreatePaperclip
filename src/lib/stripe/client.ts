import Stripe from "stripe";

let _stripe: Stripe | null = null;
let _stripeKey: string | undefined;

export function getStripe(): Stripe {
  // STRIPE_SECRET_KEY_TEST takes priority so the development Vercel environment
  // can smoke test against Stripe test mode without touching the live key.
  const key = process.env.STRIPE_SECRET_KEY_TEST ?? process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("No Stripe secret key configured");
  if (!_stripe || _stripeKey !== key) {
    _stripeKey = key;
    _stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  }
  return _stripe;
}

export function getStripeWebhookSecret(): string {
  const secret =
    process.env.STRIPE_WEBHOOK_SECRET_TEST ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  return secret;
}
