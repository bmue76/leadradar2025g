// backend/app/api/admin/form-presets/[id]/route.ts

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { jsonError, jsonOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

function isAuthError(err: unknown) {
  return (
    err instanceof Error &&
    (err.message.includes("x-user-id") || err.message.includes("User or tenant not found"))
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function snapshotFieldCount(snapshot: unknown): number {
  if (!isPlainObject(snapshot)) return 0;
  const fields = (snapshot as any).fields;
  return Array.isArray(fields) ? fields.length : 0;
}

function snapshotFieldsSummary(snapshot: unknown) {
  if (!isPlainObject(snapshot)) return [];
  const fields = (snapshot as any).fields;
  if (!Array.isArray(fields)) return [];

  return fields.map((f: any, idx: number) => ({
    order: typeof f?.order === "number" ? f.order : idx + 1,
    label: typeof f?.label === "string" ? f.label : "",
    key: typeof f?.key === "string" ? f.key : "",
    type: typeof f?.type === "string" ? f.type : "",
    required: Boolean(f?.required),
    active: f?.isActive === undefined ? true : Boolean(f?.isActive),
  }));
}

function snapshotHasKey(snapshot: unknown, key: string): boolean {
  if (!isPlainObject(snapshot)) return false;

  if (key in snapshot) return true;

  const form = (snapshot as any).form;
  if (isPlainObject(form)) {
    if (key in form) return true;

    const config = (form as any).config;
    if (isPlainObject(config) && key in config) return true;
  }

  const configTop = (snapshot as any).config;
  if (isPlainObject(configTop) && key in configTop) return true;

  return false;
}

/**
 * GET /api/admin/form-presets/[id]
 * Liefert Preset inkl. snapshot + snapshotSummary
 */
export async function GET(req: NextRequest, context: any) {
  try {
    const { tenant } = await requireAuthContext(req);

    const { id: rawId } = await context.params; // ✅ Next 16: params ist Promise
    const id = Number.parseInt(String(rawId), 10);

    if (!Number.isFinite(id) || id <= 0) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid preset id");
    }

    const preset = await prisma.formPreset.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!preset) {
      return jsonError(404, "NOT_FOUND", "Preset not found");
    }

    const fieldCount = snapshotFieldCount(preset.snapshot);
    const hasTheme = snapshotHasKey(preset.snapshot, "theme");
    const hasContactSlots = snapshotHasKey(preset.snapshot, "contactSlots");

    return jsonOk({
      preset: {
        id: preset.id,
        name: preset.name,
        category: preset.category,
        description: preset.description,
        snapshotVersion: preset.snapshotVersion,
        createdAt: preset.createdAt.toISOString(),
        updatedAt: preset.updatedAt.toISOString(),
        fieldCount,
        snapshotInfo: {
          hasTheme,
          hasContactSlots,
        },
        snapshot: preset.snapshot,
        snapshotSummary: {
          fields: snapshotFieldsSummary(preset.snapshot),
        },
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required");
    }

    console.error("Error in GET /api/admin/form-presets/[id]", error);
    return jsonError(500, "INTERNAL_ERROR", "Internal server error");
  }
}

/**
 * DELETE /api/admin/form-presets/[id]
 * Löscht ein Preset tenant-scoped
 */
export async function DELETE(req: NextRequest, context: any) {
  try {
    const { tenant } = await requireAuthContext(req);

    const { id: rawId } = await context.params; // ✅ Next 16: params ist Promise
    const id = Number.parseInt(String(rawId), 10);

    if (!Number.isFinite(id) || id <= 0) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid preset id");
    }

    const existing = await prisma.formPreset.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true },
    });

    if (!existing) {
      return jsonError(404, "NOT_FOUND", "Preset not found");
    }

    await prisma.formPreset.delete({ where: { id } });

    return jsonOk({ ok: true }, 200);
  } catch (error) {
    if (isAuthError(error)) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required");
    }

    console.error("Error in DELETE /api/admin/form-presets/[id]", error);
    return jsonError(500, "INTERNAL_ERROR", "Internal server error");
  }
}
