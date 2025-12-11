import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { generateApiKeyForTenant } from "@/lib/api-keys";
import {
  ApiKeyCreateSchema,
  type ApiKeyCreateInput,
} from "@/lib/validation/api-keys";

/**
 * Hilfsfunktion: baut ein anonymisiertes Prefix für die Anzeige.
 * Wir leaken den Hash nicht komplett, sondern zeigen nur einen Teil.
 */
function buildDisplayPrefix(keyHash: string | null): string {
  if (!keyHash || keyHash.length < 8) {
    return "lrk_********";
  }

  const tail = keyHash.slice(-6);
  return `lrk_********${tail}`;
}

function mapApiKeyDto(apiKey: {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  keyHash: string | null;
}) {
  return {
    id: apiKey.id,
    name: apiKey.name,
    isActive: apiKey.isActive,
    createdAt: apiKey.createdAt,
    lastUsedAt: apiKey.lastUsedAt,
    displayPrefix: buildDisplayPrefix(apiKey.keyHash),
  };
}

/**
 * GET /api/admin/api-keys
 * Liste aller API-Keys des aktuellen Tenants.
 */
export async function GET(req: NextRequest) {
  try {
    const { tenant } = await requireAuthContext(req);

    const apiKeys = await prisma.apiKey.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });

    const items = apiKeys.map((k) =>
      mapApiKeyDto({
        id: k.id,
        name: k.name,
        isActive: k.isActive,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        keyHash: k.keyHash ?? null,
      }),
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/admin/api-keys failed", error);
    return NextResponse.json(
      { error: "Failed to load API keys" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/api-keys
 * Neuen API-Key für den aktuellen Tenant anlegen.
 * Response enthält:
 * - apiKey: DTO für die Liste
 * - plainKey: Klartext-Key (nur einmal anzeigen!)
 */
export async function POST(req: NextRequest) {
  try {
    const { tenant } = await requireAuthContext(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    let input: ApiKeyCreateInput;
    try {
      input = ApiKeyCreateSchema.parse(body);
    } catch (err: any) {
      console.error("Validation error in POST /api/admin/api-keys", err);
      return NextResponse.json(
        { error: "Validation failed", details: err?.errors ?? undefined },
        { status: 400 },
      );
    }

    // generateApiKeyForTenant erwartet bei dir EIN Argument
    // mit Struktur { tenantId, name } und liefert { rawKey, apiKey }.
    const { apiKey, rawKey } = await generateApiKeyForTenant({
      tenantId: tenant.id,
      name: input.name,
    });

    const dto = mapApiKeyDto({
      id: apiKey.id,
      name: apiKey.name,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      keyHash: apiKey.keyHash ?? null,
    });

    return NextResponse.json(
      {
        apiKey: dto,
        // nach außen nennen wir es trotzdem "plainKey"
        plainKey: rawKey,
        note:
          "Der API-Key wird nur einmal im Klartext angezeigt. Bitte sicher speichern.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/admin/api-keys failed", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 },
    );
  }
}
