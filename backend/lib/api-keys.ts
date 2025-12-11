// backend/lib/api-keys.ts

"use server";

import { NextRequest } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { ApiKey, Tenant } from "@prisma/client";

export type ApiKeyContext = {
  tenant: Tenant;
  apiKey: ApiKey;
};

/**
 * Interne Helper-Funktion zum Hashen von API-Keys.
 * Aktuell SHA-256, kann später zentral geändert werden.
 */
function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Generiert einen neuen API-Key für einen Tenant.
 * - Erstellt einen zufälligen Token (64 hex-Zeichen ≈ 32 Bytes)
 * - Speichert nur den Hash in der DB
 * - Gibt den Klartext-Key (rawKey) + DB-Record zurück
 *
 * Wichtig: rawKey wird nur hier zurückgegeben und nie in der DB gespeichert!
 */
export async function generateApiKeyForTenant(params: {
  tenantId: number;
  name: string;
}): Promise<{ rawKey: string; apiKey: ApiKey }> {
  const { tenantId, name } = params;

  // 32 Bytes random → 64 hex Zeichen
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

/**
 * Versucht, über einen gegebenen API-Key den zugehörigen Tenant
 * und den ApiKey-Record zu ermitteln.
 *
 * - Nutzt den Hash des Keys zum Lookup
 * - Berücksichtigt nur aktive Keys (isActive = true)
 * - Aktualisiert lastUsedAt für Auditing
 */
export async function resolveTenantByApiKey(
  rawKey: string
): Promise<ApiKeyContext | null> {
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

  if (!apiKeyRecord) {
    return null;
  }

  // lastUsedAt aktualisieren (Fire-and-forget – Fehler hier sind nicht kritisch)
  try {
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });
  } catch (e) {
    // Optional: Logging ergänzen
    console.error("Failed to update ApiKey.lastUsedAt", e);
  }

  return {
    tenant: apiKeyRecord.tenant,
    apiKey: apiKeyRecord,
  };
}

/**
 * Liest den API-Key aus dem Request (Header: x-api-key)
 * und resolved den Tenant-Kontext.
 *
 * Kann später für Mobile-/Integrations-Routen verwendet werden,
 * z. B. alternativ oder ergänzend zur IP-basierten Security.
 *
 * Aktuell:
 * - wirft Fehler bei fehlendem/invalidem Key
 * - wird von API-Routen explizit aufgerufen
 */
export async function requireApiKeyContext(
  req: NextRequest
): Promise<ApiKeyContext> {
  const rawKey = req.headers.get("x-api-key");

  if (!rawKey) {
    throw new Error("Missing API key");
  }

  const context = await resolveTenantByApiKey(rawKey);

  if (!context) {
    throw new Error("Invalid or inactive API key");
  }

  return context;
}
