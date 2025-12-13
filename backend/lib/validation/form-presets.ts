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
});

export type CreatePresetRequestInput = z.infer<typeof zCreatePresetRequest>;
export type CreateFormFromPresetRequestInput = z.infer<typeof zCreateFormFromPresetRequest>;
