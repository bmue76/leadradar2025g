// lib/validation/mobile.ts
// LeadRadar2025g – Mobile API v1 validation schemas (Zod v4 compatible)

import { z } from "zod";

export const mobileLeadCreateRequestSchema = z
  .object({
    // Mobile may send ids as string; we coerce to int for Prisma
    formId: z.coerce.number().int().positive(),
    eventId: z.coerce.number().int().positive().nullable().optional(),

    // Zod v4: record(keyType, valueType)
    values: z.record(z.string(), z.unknown()),

    source: z.string().min(1).nullable().optional(),
    meta: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .strict();

export type MobileLeadCreateRequestParsed = z.infer<
  typeof mobileLeadCreateRequestSchema
>;
