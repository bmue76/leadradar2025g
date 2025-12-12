// backend/lib/validation/forms.ts

import { z } from 'zod';

/**
 * Status-Werte für Forms – entspricht dem Prisma-Enum FormStatus:
 * - DRAFT
 * - ACTIVE
 * - ARCHIVED
 */
export const formStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);

/**
 * Status, die beim Erstellen eines Formulars erlaubt sind.
 * (ARCHIVED macht beim Erstellen keinen Sinn.)
 */
export const formCreateStatusSchema = z.enum(['DRAFT', 'ACTIVE']);

/**
 * Basis-Feld-Definition für ein Formularfeld.
 * (Optional – Startpunkt; kann später mit deinem FormField-DTO
 *  ausgebaut/verknüpft werden.)
 */
export const formFieldBaseSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  order: z.number().int().optional(),
  config: z.unknown().optional(),
});

/* -------------------------------------------------------------------------- */
/*  Teilprojekt 2.18 – Theme / Branding                                       */
/* -------------------------------------------------------------------------- */

const hexColorSchema = z
  .string()
  .trim()
  .transform((s) => {
    const t = s.trim();
    if (t.length === 0) return t;
    const withHash = t.startsWith('#') ? t : `#${t}`;
    return withHash.toLowerCase();
  })
  .refine(
    (s) => /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(s),
    'Invalid hex color',
  );

export const formThemeSchema = z
  .object({
    background: hexColorSchema.optional(),
    surface: hexColorSchema.optional(),
    primary: hexColorSchema.optional(),
    text: hexColorSchema.optional(),
    muted: hexColorSchema.optional(),
    border: hexColorSchema.optional(),

    // bewusst: darf leer sein, damit "löschen" via "" möglich ist (Merge überschreibt)
    fontFamily: z.string().trim().optional(),
    logoUrl: z.string().trim().optional(),
  })
  .passthrough();

/* -------------------------------------------------------------------------- */
/*  Teilprojekt 2.17 – FormConfig & Kontakt/OCR Slot-Mapping                  */
/*  + Teilprojekt 2.18 – Theme                                                */
/* -------------------------------------------------------------------------- */

const fieldIdSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  }
  return val;
}, z.number().int().positive());

export const contactSlotsSchema = z.record(
  z.string(),
  z.union([fieldIdSchema, z.null()]),
);

export const formConfigSchema = z
  .object({
    // null => contactSlots entfernen (clear), record => Werte setzen/patchen
    contactSlots: z.union([contactSlotsSchema, z.null()]).optional(),

    // null => theme entfernen (clear), object => Werte setzen/patchen
    theme: z.union([formThemeSchema, z.null()]).optional(),
  })
  .passthrough();

/**
 * Request-Schema für das Erstellen eines Formulars (POST /api/admin/forms).
 *
 * Wichtig:
 * - Das API nimmt weiterhin "title" entgegen,
 *   wir mappen im Handler auf "name" und validieren hier "name".
 */
export const createFormRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  status: formCreateStatusSchema.optional(),
  slug: z.string().max(255).optional(),
  fields: z.array(formFieldBaseSchema).optional(),

  // Form-Level Config (Teilprojekt 2.17 / 2.18)
  config: formConfigSchema.optional(),
});

/**
 * Request-Schema für Updates (PUT/PATCH /api/admin/forms/[id])
 * -> gleiche Felder, aber alle optional.
 */
export const updateFormRequestSchema = createFormRequestSchema.partial();

export type CreateFormRequestDTO = z.infer<typeof createFormRequestSchema>;
export type UpdateFormRequestDTO = z.infer<typeof updateFormRequestSchema>;

/* -------------------------------------------------------------------------- */
/*  Teilprojekt 2.15 – Feld-Config & Select-Optionen                          */
/* -------------------------------------------------------------------------- */

/**
 * Config-Schema für Select-/Choice-Felder.
 * Wird für FormField.config verwendet, wenn der Typ ein Choice-Typ ist.
 *
 * JSON-Struktur in FormField.config:
 * {
 *   "options": [
 *     { "id": "opt-1", "label": "Heiss", "value": "hot", "isDefault": true },
 *     { "id": "opt-2", "label": "Kalt", "value": "cold" }
 *   ]
 * }
 */
export const selectFieldConfigSchema = z.object({
  options: z
    .array(
      z.object({
        id: z.string().min(1).optional(), // kann bei Bedarf generiert werden
        label: z.string().min(1, 'Label darf nicht leer sein'),
        value: z.string().optional(), // Fallback: wird aus label gesetzt
        isDefault: z.boolean().optional(),
      }),
    )
    .default([]),
});

/**
 * Request-Schema für PATCH /api/admin/forms/[formId]/fields/[fieldId]
 *
 * - Alle Properties optional (Partial-Update)
 * - config ist optional und kann für Choice-Felder ein Select-Config-Objekt sein.
 */
export const updateFormFieldRequestSchema = z.object({
  label: z.string().min(1).optional(),
  placeholder: z.string().nullable().optional(),
  helpText: z.string().nullable().optional(),
  required: z.boolean().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),

  // Für Choice-Felder: Select-Config
  // Für andere Felder: kann ignoriert werden oder generisch bleiben
  config: z
    .union([
      selectFieldConfigSchema, // sauber modellierte Select-Config
      z.record(z.string(), z.unknown()), // generische Configs für andere Feldtypen
      z.null(), // explizit config löschen
    ])
    .optional(),
});
