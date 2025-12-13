// backend/lib/types/form-presets.ts

/**
 * Liste-Item für Presets (Admin UI).
 * Wird von GET /api/admin/form-presets verwendet.
 */
export type FormPresetListItem = {
  id: number;
  name: string;
  category: string;
  description: string | null;
  snapshotVersion: number;
  fieldCount: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type GetPresetsResponse = {
  presets: FormPresetListItem[];
};

export type CreatePresetRequest = {
  formId: number;
  name: string;
  category: string;
  description?: string;
};

export type CreatePresetResponse = {
  presetId: number;
};

/**
 * Formular aus Preset erstellen (Admin UI).
 * POST /api/admin/forms/from-preset
 */
export type CreateFormFromPresetRequest = {
  presetId: number;
  name?: string;
  // ✅ niemals null senden (API akzeptiert undefined, und preprocess nimmt null an)
  description?: string;
};

/**
 * Response-Shape:
 * - formId ist "primary"
 * - id und form.id sind nur Fallback/Kompatibilität (falls du schon so antwortest)
 */
export type CreateFormFromPresetResponse = {
  formId: number;
  id?: number;
  form?: { id: number };
};

/**
 * Optional: Voll-DTO (falls du es später brauchst, z.B. Detail-Ansicht)
 * (Aktuell nicht zwingend verwendet)
 */
export type FormPresetDTO = {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  category: string;
  snapshotVersion: number;
  snapshot: unknown;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};
