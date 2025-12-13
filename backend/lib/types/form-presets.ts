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

export type PresetCategoryFacet = {
  category: string;
  count: number;
};

export type PresetsMeta = {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type GetPresetsResponse = {
  presets: FormPresetListItem[];
  categories?: PresetCategoryFacet[];
  meta?: PresetsMeta;
};

export type CreatePresetRequest = {
  formId: number;
  name: string;
  category: string;
  description?: string;
};

/**
 * POST /api/admin/form-presets
 */
export type CreatePresetResponse = {
  preset: {
    id: number;
    name: string;
    category: string;
    snapshotVersion: number;
  };
};

/**
 * GET /api/admin/form-presets/[id]
 */
export type FormPresetFieldSummary = {
  order: number;
  label: string;
  key: string;
  type: string;
  required: boolean;
  active: boolean;
};

export type FormPresetRevisionListItemDTO = {
  id: number;
  version: number;
  createdAt: string; // ISO
  // optional für später:
  createdByUserId?: number | null;
};

export type GetPresetResponse = {
  preset: {
    id: number;
    name: string;
    category: string;
    description: string | null;
    snapshotVersion: number;
    createdAt: string; // ISO
    updatedAt: string; // ISO
    fieldCount: number;
    snapshotInfo?: {
      hasTheme: boolean;
      hasContactSlots: boolean;
    };
    snapshot: unknown;
    snapshotSummary?: {
      fields: FormPresetFieldSummary[];
    };
  };
  // 2.22: History (desc nach version)
  revisions?: FormPresetRevisionListItemDTO[];
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

/**
 * 2.22 Update Preset from Form
 */
export type UpdatePresetFromFormRequest = {
  formId: number;
};

export type UpdatePresetFromFormResponse = {
  preset: {
    id: number;
    name: string;
    category: string;
    description: string | null;
    snapshotVersion: number;
    createdAt: string;
    updatedAt: string;
    fieldCount: number;
    snapshot: unknown;
  };
  revisions: FormPresetRevisionListItemDTO[];
};
