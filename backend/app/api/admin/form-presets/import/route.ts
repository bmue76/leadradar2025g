// backend/app/api/admin/form-presets/import/route.ts

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { jsonError, jsonOk } from "@/lib/api-response";
import type { ImportPresetResponse } from "@/lib/types/form-presets";
import {
  PRESET_IMPORT_MAX_BYTES,
  PRESET_IMPORT_MAX_REVISIONS,
  zPresetExportV1,
} from "@/lib/validation/form-presets";

export const dynamic = "force-dynamic";

function isAuthError(err: unknown) {
  return (
    err instanceof Error &&
    (err.message.includes("x-user-id") || err.message.includes("User or tenant not found"))
  );
}

function byteLengthUtf8(s: string) {
  return new TextEncoder().encode(s).length;
}

function zodIssuesForDetails(issues: any[]) {
  return issues.map((i) => ({
    path: Array.isArray(i.path) ? i.path.join(".") : String(i.path ?? ""),
    code: i.code,
    message: i.message,
  }));
}

/**
 * POST /api/admin/form-presets/import
 * Body: PresetExportV1 JSON
 *
 * Regeln:
 * - Import erzeugt IMMER ein neues Preset im aktuellen Tenant (kein Overwrite)
 * - snapshotVersion wird übernommen (aus Export)
 * - revisions werden importiert, wenn vorhanden + valid (max 50)
 */
export async function POST(req: NextRequest) {
  try {
    const { tenant, user } = await requireAuthContext(req);

    // Quick header check (optional, aber hilfreich)
    const contentLengthHeader = req.headers.get("content-length");
    if (contentLengthHeader) {
      const n = Number(contentLengthHeader);
      if (Number.isFinite(n) && n > PRESET_IMPORT_MAX_BYTES) {
        return jsonError(
          413,
          "IMPORT_TOO_LARGE",
          `Import JSON too large (max ${PRESET_IMPORT_MAX_BYTES} bytes)`,
        );
      }
    }

    const raw = await req.text();
    const bytes = byteLengthUtf8(raw);

    if (bytes > PRESET_IMPORT_MAX_BYTES) {
      return jsonError(
        413,
        "IMPORT_TOO_LARGE",
        `Import JSON too large (max ${PRESET_IMPORT_MAX_BYTES} bytes)`,
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return jsonError(400, "INVALID_IMPORT_JSON", "Invalid JSON");
    }

    const parsed = zPresetExportV1.safeParse(parsedJson);
    if (!parsed.success) {
      // Spezifisch auf Revision-Limit mappen (auch wenn Zod schon max() hat)
      const hasRevisionLimitIssue = parsed.error.issues.some(
        (i) => i.path?.[0] === "revisions" && (i.code === "too_big" || i.code === "custom"),
      );

      if (hasRevisionLimitIssue) {
        return jsonError(
          400,
          "IMPORT_REVISION_LIMIT",
          `Too many revisions (max ${PRESET_IMPORT_MAX_REVISIONS})`,
          { issues: zodIssuesForDetails(parsed.error.issues) },
        );
      }

      return jsonError(400, "INVALID_IMPORT_JSON", "Import JSON does not match schema", {
        issues: zodIssuesForDetails(parsed.error.issues),
      });
    }

    const payload = parsed.data;

    // Snapshot darf nicht "undefined" sein (Schema garantiert). Null behandeln wir defensiv:
    if (payload.preset.snapshot === null) {
      return jsonError(400, "INVALID_IMPORT_JSON", "preset.snapshot must not be null");
    }

    const revisions = payload.revisions ?? [];

    // zusätzliche Robustheit: Versions-Duplikate im Import verhindern
    if (revisions.length > 0) {
      const seen = new Set<number>();
      for (const r of revisions) {
        if (seen.has(r.version)) {
          return jsonError(
            400,
            "INVALID_IMPORT_JSON",
            `Duplicate revision version in import: ${r.version}`,
          );
        }
        seen.add(r.version);
      }
    }

    // Transaction: Preset neu erstellen + optional revisions importieren
    const result = await prisma.$transaction(async (tx) => {
      const newPreset = await tx.formPreset.create({
        data: {
          tenantId: tenant.id,
          name: payload.preset.name,
          category: payload.preset.category ?? "Imported",
          description: payload.preset.description ?? null,
          snapshotVersion: payload.preset.snapshotVersion,
          snapshot: payload.preset.snapshot as any,
        },
        select: { id: true, name: true, snapshotVersion: true },
      });

      let importedRevisionsCount = 0;

      if (revisions.length > 0) {
        // nicer/readable ordering – DB unique is (presetId, version) anyway
        const ordered = revisions.slice().sort((a, b) => a.version - b.version);

        const createManyResult = await tx.formPresetRevision.createMany({
          data: ordered.map((r) => ({
            tenantId: tenant.id,
            presetId: newPreset.id,
            version: r.version,
            snapshot: r.snapshot as any,
            // audit: revisions wurden jetzt importiert → current user
            createdByUserId: user.id,
          })),
        });

        importedRevisionsCount = createManyResult.count;
      }

      return { newPreset, importedRevisionsCount };
    });

    const response: ImportPresetResponse = {
      presetId: result.newPreset.id,
      name: result.newPreset.name,
      snapshotVersion: result.newPreset.snapshotVersion,
      importedRevisionsCount: result.importedRevisionsCount,
    };

    return jsonOk<ImportPresetResponse>(response, 200);
  } catch (error) {
    if (isAuthError(error)) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required");
    }

    console.error("Error in POST /api/admin/form-presets/import", error);
    return jsonError(500, "UNEXPECTED_ERROR", "Unexpected error");
  }
}
