// app/api/admin/billing/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import {
  getCurrentSubscriptionForTenant,
  isSubscriptionActive,
} from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthContext(req);
    const tenant = auth.tenant;

    const subscription = await getCurrentSubscriptionForTenant(tenant.id);

    const isActive = isSubscriptionActive(subscription);

    const status = subscription?.status ?? null;

    const flags = {
      hasSubscription: !!subscription,
      isActive,
      isTrialing: status === "trialing",
      isPastDue: status === "past_due",
      isCanceled: status === "canceled" || status === "unpaid",
    };

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            stripeCustomerId: subscription.stripeCustomerId,
            stripePriceId: subscription.stripePriceId,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAt: subscription.cancelAt,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            canceledAt: subscription.canceledAt,
            isActive: subscription.isActive,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,
          }
        : null,
      flags,
    });
  } catch (error: any) {
    console.error("Failed to load billing status:", error);
    return NextResponse.json(
      { error: "Unable to load billing status" },
      { status: 500 }
    );
  }
}
