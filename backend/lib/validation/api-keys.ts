import { z } from "zod";

export const ApiKeyCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Name ist erforderlich")
    .max(191, "Name ist zu lang"),
});

export type ApiKeyCreateInput = z.infer<typeof ApiKeyCreateSchema>;

export const ApiKeyUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name ist erforderlich")
      .max(191, "Name ist zu lang")
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.isActive !== undefined,
    {
      message: "Es wurden keine Änderungen übermittelt.",
      path: ["_"],
    },
  );

export type ApiKeyUpdateInput = z.infer<typeof ApiKeyUpdateSchema>;
