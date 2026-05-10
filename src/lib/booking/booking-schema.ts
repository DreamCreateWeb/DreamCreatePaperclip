import { z } from "zod";

const phoneRegex = /^[\d+\-().\s]{7,30}$/;

export const bookingRequestSchema = z.object({
  serviceName: z.string().trim().min(1, "Pick a service.").max(120),
  startsAt: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid time."),
  patientName: z.string().trim().min(2, "Tell us your name.").max(120),
  patientEmail: z.email("Enter a valid email.").max(200),
  patientPhone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null))
    .refine(
      (v) => v === null || phoneRegex.test(v),
      "Phone looks off — only digits, spaces, and dashes.",
    ),
  notes: z
    .string()
    .max(2000, "Keep notes under 2000 characters.")
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
  nickname: z.string().max(0).optional().or(z.literal("")),
});

export type BookingRequestPayload = z.infer<typeof bookingRequestSchema>;
