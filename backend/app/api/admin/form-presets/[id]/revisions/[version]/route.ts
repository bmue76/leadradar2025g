// backend/app/api/admin/form-presets/[id]/revisions/[version]/route.ts

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

export async function GET(req: NextRequest, context: any) {
  try {
    const { tenant } = await requireAuthContext(req);

    const params = await context.params; // Next 16: params ist Promise
    const presetId = Number.parseInt(String(params?.id), 10);
    const version = Number.parseInt(String(params?.version), 10);

    if (!Number.isFinite(presetId) || presetId <= 0) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid preset id");
    }
    if (!Number.isFinite(version) || version <= 0) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid version");
    }

    const presetIdCheck = await prisma.formPreset.findUnique({
      where: { id: presetId },
      select: { id: true, tenantId: true },
    });

    if (!presetIdCheck) {
      return jsonError(404, "PRESET_NOT_FOUND", "Preset not found");
    }
    if (presetIdCheck.tenantId !== tenant.id) {
      return jsonError(403, "TENANT_MISMATCH", "Preset does not belong to this tenant");
    }

    const revision = await prisma.formPresetRevision.findFirst({
      where: { tenantId: tenant.id, presetId, version },
      select: { id: true, version: true, createdAt: true, snapshot: true },
    });

    if (!revision) {
      return jsonError(404, "NOT_FOUND", "Revision not found");
    }

    return jsonOk({
      revision: {
        id: revision.id,
        version: revision.version,
        createdAt: revision.createdAt.toISOString(),
        snapshot: revision.snapshot,
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required");
    }

    console.error("Error in GET /api/admin/form-presets/[id]/revisions/[version]", error);
    return jsonError(500, "UNEXPECTED_ERROR", "Internal server error");
  }
}
