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
});

/**
 * Request-Schema für Updates (PUT/PATCH /api/admin/forms/[id])
 * -> gleiche Felder, aber alle optional.
 */
export const updateFormRequestSchema = createFormRequestSchema.partial();

export type CreateFormRequestDTO = z.infer<typeof createFormRequestSchema>;
export type UpdateFormRequestDTO = z.infer<typeof updateFormRequestSchema>;
