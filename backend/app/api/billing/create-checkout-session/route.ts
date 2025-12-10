// app/api/billing/create-checkout-session/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  stripe,
  getBasicPriceId,
  getBillingCancelUrl,
  getBillingSuccessUrl,
} from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthContext(req);
    const tenant = auth.tenant;

    const now = new Date();

    // 1) Prüfen, ob bereits ein aktives Abo existiert
    const existingActiveSubscription = await prisma.subscription.findFirst({
      where: {
        tenantId: tenant.id,
        isActive: true,
        status: {
          in: ["active", "trialing"],
        },
        OR: [
          {
            currentPeriodEnd: null,
          },
          {
            currentPeriodEnd: {
              gt: now,
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingActiveSubscription) {
      return NextResponse.json(
        {
          error: "Tenant already has an active subscription.",
        },
        { status: 400 }
      );
    }

    // 2) Evtl. bestehenden Stripe-Customer wiederverwenden
    const lastSubscription = await prisma.subscription.findFirst({
      where: {
        tenantId: tenant.id,
        stripeCustomerId: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const priceId = getBasicPriceId();
    const successUrl = getBillingSuccessUrl();
    const cancelUrl = getBillingCancelUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: String(tenant.id),
      metadata: {
        tenantId: String(tenant.id),
        tenantSlug: tenant.slug,
      },
      // WICHTIG: Metadaten auch auf die Subscription legen, damit wir sie in Webhooks haben
      subscription_data: {
        metadata: {
          tenantId: String(tenant.id),
          tenantSlug: tenant.slug,
        },
      },
      ...(lastSubscription?.stripeCustomerId
        ? { customer: lastSubscription.stripeCustomerId }
        : {}),
    });

    if (!session.url) {
      console.error(
        "Stripe Checkout-Session erstellt, aber keine URL erhalten",
        session
      );
      return NextResponse.json(
        {
          error: "Failed to create checkout session URL.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Failed to create Stripe Checkout Session:", error);

    return NextResponse.json(
      {
        error: "Unable to create checkout session.",
      },
      { status: 500 }
    );
  }
}
