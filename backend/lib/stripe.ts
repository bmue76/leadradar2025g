// lib/stripe.ts

import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set. Please configure it in your environment (.env)."
  );
}

// API-Version an die von deinem Stripe-SDK erwartete Version anpassen
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-11-17.clover",
});

/**
 * Basis-Price-ID für das Standard-Monatsabo.
 * Wird in der Checkout-Session verwendet.
 */
export function getBasicPriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID_BASIC;
  if (!priceId) {
    throw new Error(
      "STRIPE_PRICE_ID_BASIC is not set. Please configure it in your environment."
    );
  }
  return priceId;
}

/**
 * Webhook-Secret für die Verifikation der Stripe-Webhooks.
 * Wird später im Webhook-Handler verwendet.
 */
export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not set. Please configure it in your environment."
    );
  }
  return secret;
}

/**
 * Helper für Success-/Cancel-URLs.
 * Für local/dev kannst du Standardwerte setzen, in Produktion per ENV überschreiben.
 */
export function getBillingSuccessUrl(): string {
  return (
    process.env.STRIPE_BILLING_SUCCESS_URL ??
    "http://localhost:3000/admin/billing/success"
  );
}

export function getBillingCancelUrl(): string {
  return (
    process.env.STRIPE_BILLING_CANCEL_URL ??
    "http://localhost:3000/admin/billing/cancel"
  );
}
