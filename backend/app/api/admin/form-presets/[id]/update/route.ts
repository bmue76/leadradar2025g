// backend/app/api/admin/form-presets/[id]/update/route.ts

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { jsonError, jsonOk } from "@/lib/api-response";
import { zUpdatePresetFromFormRequest } from "@/lib/validation/form-presets";
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
 * POST /api/admin/form-presets/[id]/update
 * Body: { formId }
 *
 * Transaction:
 * 1) Preset laden (tenant-scoped)
 * 2) Current Snapshot als Revision speichern (version = snapshotVersion)
 * 3) Snapshot aus Form + Fields erzeugen
 * 4) Preset updaten: snapshot = newSnapshot, snapshotVersion++
 * 5) Return: preset + revisions
 */
export async function POST(req: NextRequest, context: any) {
  try {
    const { tenant } = await requireAuthContext(req);

    const params = await context.params; // ✅ Next 16: params ist Promise
    const presetId = Number.parseInt(String(params?.id), 10);

    if (!Number.isFinite(presetId) || presetId <= 0) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid preset id");
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonError(400, "INVALID_JSON", "Invalid JSON");
    }

    const parsed = zUpdatePresetFromFormRequest.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid payload", parsed.error.flatten());
    }

    const { formId } = parsed.data;

    const result = await prisma
      .$transaction(async (tx) => {
        const preset = await tx.formPreset.findFirst({
          where: { id: presetId, tenantId: tenant.id },
        });

        if (!preset) {
          return { kind: "PRESET_NOT_FOUND" as const };
        }

        // Form: sauber unterscheiden zwischen "nicht vorhanden" und "tenant mismatch"
        const formHead = await tx.form.findUnique({
          where: { id: formId },
          select: { id: true, tenantId: true },
        });

        if (!formHead) {
          return { kind: "FORM_NOT_FOUND" as const };
        }
        if (formHead.tenantId !== tenant.id) {
          return { kind: "TENANT_MISMATCH" as const };
        }

        const form = await tx.form.findFirst({
          where: { id: formId, tenantId: tenant.id },
          include: {
            fields: {
              orderBy: [{ order: "asc" }, { id: "asc" }],
            },
          },
        });

        if (!form) {
          // defensiv
          return { kind: "FORM_NOT_FOUND" as const };
        }

        // 2) Current Snapshot -> Revision (version = current snapshotVersion)
        // Unique constraint: @@unique([presetId, version])
        await tx.formPresetRevision.create({
          data: {
            tenantId: tenant.id,
            presetId: preset.id,
            version: preset.snapshotVersion,
            snapshot: preset.snapshot as any,
          },
        });

        // 3) New Snapshot aus Form + Fields (wie beim Preset-Create)
        const newSnapshot = {
          form: {
            name: form.name ?? null,
            title: (form as any).title ?? null,
            description: form.description ?? null,
            status: (form as any).status ?? (form as any).state ?? null,
            config: (form as any).config ?? null,
          },
          fields: form.fields.map((f) => ({
            key: f.key,
            label: f.label,
            type: f.type,
            placeholder: f.placeholder,
            helpText: f.helpText,
            required: f.required,
            order: f.order,
            isActive: f.isActive,
            config: (f as any).config ?? undefined,
          })),
        };

        const nextVersion = preset.snapshotVersion + 1;

        // 4) Preset updaten
        const updatedPreset = await tx.formPreset.update({
          where: { id: preset.id },
          data: {
            snapshotVersion: nextVersion,
            snapshot: newSnapshot as any,
          },
        });

        // 5) Revisions zurückgeben (desc)
        const revisions = await tx.formPresetRevision.findMany({
          where: { tenantId: tenant.id, presetId: preset.id },
          orderBy: [{ version: "desc" }, { id: "desc" }],
          select: { id: true, version: true, createdAt: true },
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
    if (result.kind === "FORM_NOT_FOUND") {
      return jsonError(404, "FORM_NOT_FOUND", "Form not found");
    }
    if (result.kind === "TENANT_MISMATCH") {
      return jsonError(403, "TENANT_MISMATCH", "Form does not belong to this tenant");
    }
    if (result.kind === "CONFLICT") {
      return jsonError(409, "CONFLICT", "Preset update conflict (revision already exists)");
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
      })),
    });
  } catch (error) {
    if (isAuthError(error)) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required");
    }

    console.error("Error in POST /api/admin/form-presets/[id]/update", error);
    return jsonError(500, "UNEXPECTED_ERROR", "Internal server error");
  }
}
