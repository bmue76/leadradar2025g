// lib/auth-context.ts

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Tenant, User } from "@prisma/client";

export type AuthContext = {
  user: User;
  tenant: Tenant;
};

/**
 * Liest die x-user-id aus dem Request-Header und lädt User + Tenant.
 * Wenn etwas nicht passt, wird ein Error geworfen (wird im Route-Handler gefangen).
 */
export async function requireAuthContext(req: NextRequest): Promise<AuthContext> {
  const userIdHeader = req.headers.get("x-user-id");

  if (!userIdHeader) {
    throw new Error("Missing x-user-id header");
  }

  const userId = Number(userIdHeader);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error("Invalid x-user-id header");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  });

  if (!user || !user.tenant) {
    throw new Error("User or tenant not found");
  }

  return {
    user,
    tenant: user.tenant,
  };
}
