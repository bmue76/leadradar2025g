// lib/subscription.ts

import { prisma } from "@/lib/prisma";
import type {
  Subscription,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from "@prisma/client";
import type { AuthContext } from "@/lib/auth-context";

/**
 * Business-Logik: Wann gilt ein Abo als "aktiv"?
 */
export function isSubscriptionActive(
  subscription: Subscription | null
): boolean {
  if (!subscription) return false;

  const status = subscription.status as PrismaSubscriptionStatus;
  const now = new Date();

  const isStatusActive =
    status === "active" || status === "trialing";

  const isWithinPeriod =
    !subscription.currentPeriodEnd ||
    subscription.currentPeriodEnd > now;

  return isStatusActive && subscription.isActive && isWithinPeriod;
}

/**
 * Holt die aktuell "relevante" Subscription eines Tenants.
 * Für den Moment: die zuletzt erstellte Subscription (createdAt desc).
 */
export async function getCurrentSubscriptionForTenant(
  tenantId: number
): Promise<Subscription | null> {
  const sub = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: {
      createdAt: "desc",
    },
  });

  return sub;
}

/**
 * Convenience-Helper: Hat der Tenant aktuell ein aktives Abo?
 */
export async function hasActiveSubscription(
  tenantId: number
): Promise<boolean> {
  const sub = await getCurrentSubscriptionForTenant(tenantId);
  return isSubscriptionActive(sub);
}

/**
 * Helper für geschützte Routen:
 * Wirft einen Error, wenn der Tenant kein aktives Abo hat.
 * Kann in API-Routen genutzt werden, um Feature-Gates zu implementieren.
 */
export async function requireActiveSubscription(
  auth: AuthContext
): Promise<Subscription> {
  const sub = await getCurrentSubscriptionForTenant(auth.tenant.id);

  if (!sub || !isSubscriptionActive(sub)) {
    throw new Error("No active subscription for tenant");
  }

  return sub;
}
