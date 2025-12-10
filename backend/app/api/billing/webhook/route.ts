// app/api/billing/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, getStripeWebhookSecret } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus as PrismaSubscriptionStatus } from "@prisma/client";

export const runtime = "nodejs";

// Hilfsfunktion: Unix-Timestamp (Sekunden) → Date | null
function tsToDate(ts: number | null | undefined): Date | null {
  if (!ts) return null;
  return new Date(ts * 1000);
}

// Hilfsfunktion: ob Abo als "aktiv" gezählt werden soll
function computeIsActive(status: PrismaSubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("Stripe Webhook: Missing stripe-signature header");
    return new NextResponse("Missing stripe-signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = getStripeWebhookSecret();
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Stripe Webhook: Signature verification failed", err);
    return new NextResponse("Webhook signature verification failed", {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log(
          "Stripe Webhook: checkout.session.completed",
          session.id,
          session.client_reference_id,
          session.subscription
        );
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const status = subscription.status as PrismaSubscriptionStatus;

        // Tenant-ID aus den Metadaten
        const tenantIdRaw =
          subscription.metadata?.tenantId ??
          // Fallback: falls mal nur über metadata.tenant_id gesetzt
          (subscription.metadata as any)?.tenant_id;

        if (!tenantIdRaw) {
          console.error(
            "Stripe Webhook: Subscription without tenantId in metadata",
            subscription.id
          );
          // Trotzdem 200, damit Stripe nicht dauerhaft retryt
          break;
        }

        const tenantId = Number(tenantIdRaw);
        if (!Number.isFinite(tenantId) || tenantId <= 0) {
          console.error(
            "Stripe Webhook: Invalid tenantId in subscription metadata",
            tenantIdRaw
          );
          break;
        }

        const stripeSubscriptionId = subscription.id;

        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id ?? null;

        const firstItem = subscription.items.data[0];
        const priceId = firstItem?.price?.id ?? null;

        // 🔧 Stripe-Typen scheinen hier keine current_period_start/_end zu kennen
        // → wir lesen sicherheitshalber via any und unterstützen snake_case + camelCase.
        const subAny = subscription as any;

        const currentPeriodStartTs =
          subAny.current_period_start ?? subAny.currentPeriodStart ?? null;
        const currentPeriodEndTs =
          subAny.current_period_end ?? subAny.currentPeriodEnd ?? null;
        const cancelAtTs =
          subAny.cancel_at ?? subAny.cancelAt ?? null;
        const canceledAtTs =
          subAny.canceled_at ?? subAny.canceledAt ?? null;

        const currentPeriodStart = tsToDate(currentPeriodStartTs);
        const currentPeriodEnd = tsToDate(currentPeriodEndTs);
        const cancelAt = tsToDate(cancelAtTs);
        const canceledAt = tsToDate(canceledAtTs);

        const cancelAtPeriodEnd = subAny.cancel_at_period_end ?? subAny.cancelAtPeriodEnd ?? false;

        const isActive = computeIsActive(status);

        await prisma.subscription.upsert({
          where: {
            stripeSubscriptionId: stripeSubscriptionId,
          },
          update: {
            tenantId,
            stripeCustomerId: customerId ?? undefined,
            stripePriceId: priceId ?? undefined,
            status,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAt,
            cancelAtPeriodEnd,
            canceledAt,
            isActive,
          },
          create: {
            tenantId,
            stripeSubscriptionId: stripeSubscriptionId,
            stripeCustomerId: customerId ?? undefined,
            stripePriceId: priceId ?? undefined,
            status,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAt,
            cancelAtPeriodEnd,
            canceledAt,
            isActive,
          },
        });

        console.log(
          `Stripe Webhook: Subscription ${event.type} processed for tenant ${tenantId} (sub: ${stripeSubscriptionId})`
        );
        break;
      }

      default: {
        console.log(`Stripe Webhook: Ignored event type ${event.type}`);
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err: any) {
    console.error("Stripe Webhook: Error handling event", (event as any)?.id, err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}
