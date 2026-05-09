import { z } from "zod";

import { teamMemberSchema } from "@/src/lib/onboarding/schema";

export const teamUpdateSchema = z.object({
  team: z
    .array(teamMemberSchema)
    .min(1, "Add at least one team member")
    .max(40, "Up to 40 team members"),
});

export type TeamUpdateInput = z.input<typeof teamUpdateSchema>;
export type TeamUpdatePayload = z.output<typeof teamUpdateSchema>;
