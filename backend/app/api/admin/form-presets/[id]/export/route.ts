// backend/app/api/admin/form-presets/[id]/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";
import { jsonError } from "@/lib/api-response";
import type { PresetExportV1 } from "@/lib/types/form-presets";
import { PRESET_IMPORT_MAX_REVISIONS } from "@/lib/validation/form-presets";

export const dynamic = "force-dynamic";

function isAuthError(err: unknown) {
  return (
    err instanceof Error &&
    (err.message.includes("x-user-id") || err.message.includes("User or tenant not found"))
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function buildFilename(presetId: number, d = new Date()) {
  // YYYYMMDD-HHMM (local server time; reicht für Dateiname)
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `preset-${presetId}-${yyyy}${mm}${dd}-${hh}${mi}.json`;
}

/**
 * GET /api/admin/form-presets/[id]/export
 * Optional: ?includeRevisions=1
 *
 * Response: download (Content-Disposition: attachment)
 */
export async function GET(req: NextRequest, context: any) {
  try {
    const { tenant } = await requireAuthContext(req);

    const { id: rawId } = await context.params; // ✅ Next 16: params ist Promise
    const id = Number.parseInt(String(rawId), 10);

    if (!Number.isFinite(id) || id <= 0) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid preset id");
    }

    const includeRevisions =
      req.nextUrl.searchParams.get("includeRevisions") === "1" ||
      req.nextUrl.searchParams.get("includeRevisions") === "true";

    const preset = await prisma.formPreset.findFirst({
      where: { id, tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        snapshotVersion: true,
        snapshot: true,
      },
    });

    if (!preset) {
      return jsonError(404, "NOT_FOUND", "Preset not found");
    }

    let revisions: PresetExportV1["revisions"] | undefined = undefined;

    if (includeRevisions) {
      // Export max N revisions (aligned with import hard limit)
      const rows = await prisma.formPresetRevision.findMany({
        where: { tenantId: tenant.id, presetId: preset.id },
        orderBy: [{ version: "desc" }, { id: "desc" }],
        take: PRESET_IMPORT_MAX_REVISIONS,
        select: {
          version: true,
          snapshot: true,
          createdAt: true,
        },
      });

      // make ascending by version for nicer diffs/reading
      revisions = rows
        .slice()
        .reverse()
        .map((r) => ({
          version: r.version,
          snapshot: r.snapshot,
          createdAt: r.createdAt?.toISOString(),
        }));
    }

    const payload: PresetExportV1 = {
      format: "leadradar-form-preset",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      preset: {
        name: preset.name,
        category: preset.category || undefined,
        description: preset.description ?? undefined,
        snapshotVersion: preset.snapshotVersion,
        snapshot: preset.snapshot,
      },
      ...(revisions ? { revisions } : {}),
    };

    const filename = buildFilename(preset.id);

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required");
    }

    console.error("Error in GET /api/admin/form-presets/[id]/export", error);
    return jsonError(500, "INTERNAL_ERROR", "Internal server error");
  }
}
