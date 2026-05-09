import { z } from "zod";

import { serviceSchema } from "@/src/lib/onboarding/schema";

export const servicesUpdateSchema = z.object({
  services: z
    .array(serviceSchema)
    .min(1, "Add at least one service")
    .max(20, "Up to 20 services"),
});

export type ServicesUpdateInput = z.input<typeof servicesUpdateSchema>;
export type ServicesUpdatePayload = z.output<typeof servicesUpdateSchema>;
