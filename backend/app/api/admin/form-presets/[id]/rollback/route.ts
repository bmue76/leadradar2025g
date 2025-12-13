// backend/app/api/admin/form-presets/[id]/rollback/route.ts

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { jsonError, jsonOk } from "@/lib/api-response";
import { zRollbackPresetRequest } from "@/lib/validation/form-presets";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function isAuthError(err: unknown) {
  return (
    err instanceof Error &&
    (err.message.includes("x-user-id") || err.message.includes("User or tenant not found"))
  );
}

function isUniqueConstraintError(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * POST /api/admin/form-presets/[id]/rollback
 * Body: { version }
 *
 * Transaction:
 * 1) Preset laden (tenant-scope strikt)
 * 2) Revision (presetId+version) laden (tenant)
 * 3) Current als neue Revision speichern (version = preset.snapshotVersion)
 *    - createdByUserId = auth.user.id (wenn vorhanden)
 * 4) Preset update:
 *    - snapshot = revision.snapshot
 *    - snapshotVersion = preset.snapshotVersion + 1
 * 5) Return: preset + revisions (desc)
 */
export async function POST(req: NextRequest, context: any) {
  try {
    const { tenant, user } = await requireAuthContext(req);

    const params = await context.params; // ✅ Next 16: params ist Promise
    const presetId = Number.parseInt(String(params?.id), 10);

    if (!Number.isFinite(presetId) || presetId <= 0) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid preset id");
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonError(400, "INVALID_JSON", "Invalid JSON");
    }

    const parsed = zRollbackPresetRequest.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid payload", parsed.error.flatten());
    }

    const { version } = parsed.data;

    const result = await prisma
      .$transaction(async (tx) => {
        // 1) Preset laden (tenant-scope strikt, inkl. explizitem TENANT_MISMATCH)
        const preset = await tx.formPreset.findUnique({
          where: { id: presetId },
        });

        if (!preset) {
          return { kind: "PRESET_NOT_FOUND" as const };
        }
        if (preset.tenantId !== tenant.id) {
          return { kind: "TENANT_MISMATCH" as const };
        }

        // Version darf nicht "current" sein (Revision existiert typischerweise nur für ältere Stände)
        if (version === preset.snapshotVersion) {
          return { kind: "INVALID_VERSION" as const, currentVersion: preset.snapshotVersion };
        }

        // 2) Revision laden
        const revision = await tx.formPresetRevision.findFirst({
          where: {
            tenantId: tenant.id,
            presetId: preset.id,
            version,
          },
        });

        if (!revision) {
          return { kind: "REVISION_NOT_FOUND" as const };
        }

        // 3) Current Snapshot -> neue Revision
        await tx.formPresetRevision.create({
          data: {
            tenantId: tenant.id,
            presetId: preset.id,
            version: preset.snapshotVersion,
            snapshot: preset.snapshot as any,
            createdByUserId: user?.id ?? null,
          },
        });

        const nextVersion = preset.snapshotVersion + 1;

        // 4) Preset update auf Revision.snapshot
        const updatedPreset = await tx.formPreset.update({
          where: { id: preset.id },
          data: {
            snapshotVersion: nextVersion,
            snapshot: revision.snapshot as any,
          },
        });

        // 5) Revisions zurückgeben (desc)
        const revisions = await tx.formPresetRevision.findMany({
          where: { tenantId: tenant.id, presetId: preset.id },
          orderBy: [{ version: "desc" }, { id: "desc" }],
          select: { id: true, version: true, createdAt: true, createdByUserId: true },
        });

        return {
          kind: "OK" as const,
          preset: updatedPreset,
          revisions,
        };
      })
      .catch((err) => {
        // bei concurrency kann die Revision-Unique knallen
        if (isUniqueConstraintError(err)) {
          return { kind: "CONFLICT" as const };
        }
        throw err;
      });

    if (result.kind === "PRESET_NOT_FOUND") {
      return jsonError(404, "PRESET_NOT_FOUND", "Preset not found");
    }
    if (result.kind === "TENANT_MISMATCH") {
      return jsonError(403, "TENANT_MISMATCH", "Preset does not belong to this tenant");
    }
    if (result.kind === "INVALID_VERSION") {
      return jsonError(
        400,
        "INVALID_VERSION",
        "Invalid version (cannot rollback to current or non-existing version)",
        { currentVersion: (result as any).currentVersion ?? null },
      );
    }
    if (result.kind === "REVISION_NOT_FOUND") {
      return jsonError(404, "REVISION_NOT_FOUND", "Revision not found");
    }
    if (result.kind === "CONFLICT") {
      return jsonError(409, "REVISION_CONFLICT", "Rollback conflict (revision already exists)");
    }

    const preset = result.preset;
    const fieldCount = Array.isArray((preset.snapshot as any)?.fields)
      ? (preset.snapshot as any).fields.length
      : 0;

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
        snapshot: preset.snapshot,
      },
      revisions: result.revisions.map((r) => ({
        id: r.id,
        version: r.version,
        createdAt: r.createdAt.toISOString(),
        createdByUserId: r.createdByUserId ?? null,
      })),
    });
  } catch (error) {
    if (isAuthError(error)) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required");
    }

    console.error("Error in POST /api/admin/form-presets/[id]/rollback", error);
    return jsonError(500, "UNEXPECTED_ERROR", "Internal server error");
  }
}
