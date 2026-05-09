import { z } from "zod";

export const adminInviteOwnerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .max(200),
});

export type AdminInviteOwnerInput = z.input<typeof adminInviteOwnerSchema>;
export type AdminInviteOwnerPayload = z.output<typeof adminInviteOwnerSchema>;
