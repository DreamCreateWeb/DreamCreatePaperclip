import { z } from "zod";

import {
  addressSchema,
  hoursDaySchema,
  socialSchema,
} from "@/src/lib/onboarding/schema";

const PHONE_PATTERN = /^[0-9+\-().\s]{10,20}$/;

export const siteUpdateSchema = z.object({
  name: z.string().trim().min(2, "Clinic name is required").max(120),
  contactPhone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, "Enter a valid US phone number"),
  address: addressSchema,
  hours: z.array(hoursDaySchema).length(7, "Set all seven days"),
  social: socialSchema,
});

export type SiteUpdateInput = z.input<typeof siteUpdateSchema>;
export type SiteUpdatePayload = z.output<typeof siteUpdateSchema>;
