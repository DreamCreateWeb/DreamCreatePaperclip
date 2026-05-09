import { z } from "zod";

import { brandSchema } from "@/src/lib/onboarding/schema";

export const brandUpdateSchema = z.object({
  brand: brandSchema,
});

export type BrandUpdateInput = z.input<typeof brandUpdateSchema>;
export type BrandUpdatePayload = z.output<typeof brandUpdateSchema>;
