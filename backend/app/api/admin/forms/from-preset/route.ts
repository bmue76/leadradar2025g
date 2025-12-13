import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, FormFieldType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  presetId: z.number().int().positive(),
  name: z.string().trim().min(1).max(120).optional(),
  // ✅ akzeptiert null/"" => undefined, damit Client niemals "null" erzwingen muss
  description: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.string().trim().min(1).max(500).optional(),
  ),
});

type SnapshotV1 = {
  form?: {
    name?: string | null;
    description?: string | null;
    config?: unknown | null;
  };
  fields?: Array<{
    key?: string | null;
    label?: string | null;
    type?: string | null;
    placeholder?: string | null;
    helpText?: string | null;
    required?: boolean | null;
    order?: number | null;
    isActive?: boolean | null;
    config?: unknown | null;
  }>;
};

function toJsonInput(
  value: unknown,
):
  | Prisma.InputJsonValue
  | Prisma.NullableJsonNullValueInput
  | undefined {
  if (typeof value === "undefined") return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function toFieldType(raw: unknown): FormFieldType {
  const s = String(raw ?? "").trim();
  const valid = new Set(Object.values(FormFieldType) as string[]);
  return valid.has(s) ? (s as FormFieldType) : FormFieldType.TEXT;
}

export async function POST(req: Request) {
  try {
    const userIdHeader = req.headers.get("x-user-id");
    const userId = Number(userIdHeader ?? NaN);
    if (!Number.isFinite(userId)) {
      return NextResponse.json(
        { error: "Missing or invalid x-user-id header" },
        { status: 401 },
      );
    }

    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { presetId, name, description } = parsed.data;

    const preset = await prisma.formPreset.findUnique({
      where: { id: presetId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        snapshotVersion: true,
        snapshot: true,
      },
    });

    if (!preset) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    }

    // ✅ tenantId immer aus Preset
    const tenantId = preset.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          error: `Tenant ${tenantId} referenced by preset ${presetId} does not exist.`,
          details:
            "Seed/DB prüfen: Tenant anlegen oder preset.tenantId korrigieren.",
        },
        { status: 409 },
      );
    }

    const snapshot = (preset.snapshot ?? {}) as unknown as SnapshotV1;
    const snapForm = snapshot.form ?? {};
    const snapFields = Array.isArray(snapshot.fields) ? snapshot.fields : [];

    const finalName =
      (name?.trim() ||
        String(snapForm.name ?? "").trim() ||
        preset.name ||
        `Formular aus Vorlage #${presetId}`)!.slice(0, 120);

    // ✅ description: undefined/null sauber behandeln
    const snapDesc = String(snapForm.description ?? "").trim();
    const presetDesc = String(preset.description ?? "").trim();
    const reqDesc = typeof description === "string" ? description.trim() : "";

    const finalDesc =
      (reqDesc.length ? reqDesc : null) ??
      (snapDesc.length ? snapDesc : null) ??
      (presetDesc.length ? presetDesc : null) ??
      null;

    const createdForm = await prisma.form.create({
      data: {
        tenant: { connect: { id: tenantId } },
        name: finalName,
        description: finalDesc,
        status: "DRAFT",
        // Prisma will kein "null" bei Json-Feld in CreateInput, daher toJsonInput
        config: toJsonInput(snapForm.config),
        fields: {
          create: snapFields.map((f, idx) => {
            const key = String(f.key ?? `field_${idx + 1}`).trim();

            return {
              tenant: { connect: { id: tenantId } },
              key,
              label: String(f.label ?? "").trim() || key || `Feld ${idx + 1}`,
              type: toFieldType(f.type),
              placeholder: f.placeholder ?? null,
              helpText: f.helpText ?? null,
              required: !!f.required,
              order:
                typeof f.order === "number" && Number.isFinite(f.order)
                  ? f.order
                  : idx + 1,
              isActive: f.isActive !== false,
              config: toJsonInput(f.config),
            };
          }),
        },
      },
      select: { id: true },
    });

    // ✅ formId ist primary (Client erwartet das)
    return NextResponse.json({ formId: createdForm.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/forms/from-preset failed", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
