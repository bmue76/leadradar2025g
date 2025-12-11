import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import {
  ApiKeyUpdateSchema,
  type ApiKeyUpdateInput,
} from "@/lib/validation/api-keys";

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

// In Next.js 16 sind params ein Promise und müssen erst aufgelöst werden.
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * PATCH /api/admin/api-keys/[id]
 * Name und/oder isActive updaten.
 * Stellt sicher, dass der Key zum aktuellen Tenant gehört.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { tenant } = await requireAuthContext(req);

    const { id } = await context.params; // params-Promise auflösen
    const idParam = id;

    if (!idParam) {
      return NextResponse.json(
        { error: "Missing API key id" },
        { status: 400 },
      );
    }

    // IDs kommen als String aus der URL, in der DB ist es (vermutlich) ein Int
    const apiKeyId = Number(idParam);
    if (!Number.isFinite(apiKeyId)) {
      return NextResponse.json(
        { error: "Invalid API key id" },
        { status: 400 },
      );
    }

    // Prüfen, ob der Key zum Tenant gehört
    const existing = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    let input: ApiKeyUpdateInput;
    try {
      input = ApiKeyUpdateSchema.parse(body);
    } catch (err: any) {
      console.error(
        `Validation error in PATCH /api/admin/api-keys/${idParam}`,
        err,
      );
      return NextResponse.json(
        { error: "Validation failed", details: err?.errors ?? undefined },
        { status: 400 },
      );
    }

    const updated = await prisma.apiKey.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    const dto = mapApiKeyDto({
      id: updated.id,
      name: updated.name,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      lastUsedAt: updated.lastUsedAt,
      keyHash: updated.keyHash ?? null,
    });

    return NextResponse.json({ apiKey: dto });
  } catch (error) {
    console.error("PATCH /api/admin/api-keys/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 },
    );
  }
}
