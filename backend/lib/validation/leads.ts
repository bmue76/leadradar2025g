// backend/lib/validation/leads.ts

import { z } from 'zod';

/**
 * Werte eines Leads:
 * - freie Key-Value-Struktur basierend auf FormField.key
 * - Keys sind Strings, Values beliebige Typen
 */
export const leadValuesSchema = z.record(z.string(), z.unknown());

/**
 * Request-Schema für POST /api/leads
 *
 * formId: positive ganze Zahl
 * values: Objekt mit beliebigen Keys (Lead-Werte)
 * eventId: optional, positive ganze Zahl
 * source: optional, kurze Quelle (z. B. "mobile-app")
 */
export const createLeadRequestSchema = z.object({
  formId: z.number().int().positive(),
  values: leadValuesSchema,
  eventId: z.number().int().positive().optional(),
  source: z.string().max(255).optional(),
});

export type CreateLeadRequestDTO = z.infer<typeof createLeadRequestSchema>;
