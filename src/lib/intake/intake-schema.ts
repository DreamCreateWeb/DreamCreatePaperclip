import { z } from "zod";

export const intakeSubmitSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  patientName: z.string().trim().min(2, "Tell us your name.").max(120),
  patientEmail: z.email("Enter a valid email.").max(200),
  patientDob: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined)),
  responses: z.record(z.string(), z.unknown()),
  nickname: z.string().max(0).optional().or(z.literal("")),
});

export type IntakeSubmitPayload = z.infer<typeof intakeSubmitSchema>;
