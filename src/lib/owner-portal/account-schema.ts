import { z } from "zod";

export const accountUpdateSchema = z.object({
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .max(200),
});

export type AccountUpdateInput = z.input<typeof accountUpdateSchema>;
export type AccountUpdatePayload = z.output<typeof accountUpdateSchema>;
