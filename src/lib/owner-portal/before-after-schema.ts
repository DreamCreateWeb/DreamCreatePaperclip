import { z } from "zod";

import { beforeAfterPairSchema } from "@/src/lib/onboarding/schema";

export const beforeAfterUpdateSchema = z.object({
  pairs: z.array(beforeAfterPairSchema).max(20, "Up to 20 before/after pairs"),
});

export type BeforeAfterUpdateInput = z.input<typeof beforeAfterUpdateSchema>;
export type BeforeAfterUpdatePayload = z.output<typeof beforeAfterUpdateSchema>;
