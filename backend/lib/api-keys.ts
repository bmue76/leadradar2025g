// backend/lib/api-keys.ts

"use server";

import { NextRequest } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { ApiKey, Tenant } from "@prisma/client";

export type ApiAuthErrorCode = "UNAUTHORIZED" | "FORBIDDEN";

export type ApiKeyContext = {
  tenant: Tenant;
  apiKey: ApiKey;
  tenantId: Tenant["id"];
  apiKeyId: ApiKey["id"];
};

/**
 * Interne Helper-Funktion zum Hashen von API-Keys.
 */
function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Fehlerobjekt mit HTTP-Status + Code für konsistente Responses.
 */
function createApiKeyError(
  message: string,
  status: number,
  code: ApiAuthErrorCode = "UNAUTHORIZED"
): Error & { status: number; code: ApiAuthErrorCode } {
  const error = new Error(message) as Error & { status: number; code: ApiAuthErrorCode };
  error.status = status;
  error.code = code;
  return error;
}

export async function generateApiKeyForTenant(params: {
  tenantId: number;
  name: string;
}): Promise<{ rawKey: string; apiKey: ApiKey }> {
  const { tenantId, name } = params;

  const rawKey = randomBytes(32).toString("hex");
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      tenantId,
      name,
      keyHash,
    },
  });

  return { rawKey, apiKey };
}

export async function resolveTenantByApiKey(rawKey: string): Promise<ApiKeyContext | null> {
  if (!rawKey) return null;

  const keyHash = hashApiKey(rawKey);

  const apiKeyRecord = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      isActive: true,
    },
    include: {
      tenant: true,
    },
  });

  if (!apiKeyRecord) return null;

  try {
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });
  } catch (e) {
    console.error("Failed to update ApiKey.lastUsedAt", e);
  }

  return {
    tenant: apiKeyRecord.tenant,
    apiKey: apiKeyRecord,
    tenantId: apiKeyRecord.tenantId,
    apiKeyId: apiKeyRecord.id,
  };
}

export async function requireApiKeyContext(req: NextRequest): Promise<ApiKeyContext> {
  const rawKey = req.headers.get("x-api-key");

  if (!rawKey) {
    throw createApiKeyError("Missing API key", 401, "UNAUTHORIZED");
  }

  const context = await resolveTenantByApiKey(rawKey);

  if (!context) {
    // Invalid oder inaktiv – aktuell nicht unterschieden (weil resolve nur aktive Keys lädt)
    throw createApiKeyError("Invalid or inactive API key", 401, "UNAUTHORIZED");
  }

  return context;
}
