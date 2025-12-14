import { z } from "zod";

export const zCreatePresetRequest = z.object({
  formId: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const zCreateFormFromPresetRequest = z.object({
  presetId: z.number().int().positive(),
  name: z.string().trim().min(1).max(120).optional().nullable(),
  // ✅ align mit Type (CreateFormFromPresetRequest)
  description: z.string().trim().max(2000).optional().nullable(),
});

// 2.22: Preset Update from Form
export const zUpdatePresetFromFormRequest = z.object({
  formId: z.number().int().positive(),
});

// 2.23A: Rollback Preset to a Revision
export const zRollbackPresetRequest = z.object({
  version: z.number().int().positive(),
});

/**
 * 2.23B – Preset Import/Export Limits
 * (Size wird im Endpoint anhand Raw-Body geprüft; hier liegen die gemeinsamen Konstanten)
 */
export const PRESET_IMPORT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const PRESET_IMPORT_MAX_REVISIONS = 50;

/**
 * 2.23B – Zod Schema: PresetExportV1
 * Forward-compatible: erlaubt zusätzliche Felder (passthrough),
 * validiert aber alle required Felder strikt.
 */
export const zPresetExportV1 = z
  .object({
    format: z.literal("leadradar-form-preset"),
    formatVersion: z.literal(1),
    exportedAt: z.string().datetime(),
    preset: z
      .object({
        name: z.string().trim().min(1).max(120),
        category: z.string().trim().min(1).max(80).optional(),
        description: z.string().trim().max(2000).optional(),
        snapshotVersion: z.number().int().positive(),
        snapshot: z.unknown(),
      })
      .passthrough(),
    revisions: z
      .array(
        z
          .object({
            version: z.number().int().positive(),
            snapshot: z.unknown(),
            createdAt: z.string().datetime().optional(),
          })
          .passthrough()
      )
      .max(PRESET_IMPORT_MAX_REVISIONS, {
        message: `Too many revisions (max ${PRESET_IMPORT_MAX_REVISIONS})`,
      })
      .optional(),
  })
  .passthrough();

/**
 * 2.23B – helper: validiert Payload und liefert typed Resultat
 */
export function parsePresetExportV1(payload: unknown) {
  return zPresetExportV1.parse(payload);
}

export type CreatePresetRequestInput = z.infer<typeof zCreatePresetRequest>;
export type CreateFormFromPresetRequestInput = z.infer<typeof zCreateFormFromPresetRequest>;
export type UpdatePresetFromFormRequestInput = z.infer<typeof zUpdatePresetFromFormRequest>;
export type RollbackPresetRequestInput = z.infer<typeof zRollbackPresetRequest>;
export type PresetExportV1Input = z.infer<typeof zPresetExportV1>;
