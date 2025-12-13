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

/**
 * DELETE /api/admin/form-presets/[id]
 * Löscht ein Preset tenant-scoped
 */
export async function DELETE(req: NextRequest, context: any) {
  try {
    const { tenant } = await requireAuthContext(req);

    const { id: rawId } = await context.params;
    const id = Number.parseInt(rawId, 10);

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
