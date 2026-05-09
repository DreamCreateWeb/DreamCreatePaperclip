import { z } from "zod";

const PHONE_PATTERN = /^[0-9+\-().\s]{7,30}$/;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined));

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, "Your name is required").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .max(200),
  phone: optionalString(30).pipe(
    z
      .string()
      .regex(PHONE_PATTERN, "Enter a valid phone number")
      .optional(),
  ),
  message: z
    .string()
    .trim()
    .min(5, "Tell us a little more")
    .max(2000, "Message is too long"),
  // Honeypot: real users leave it blank.
  nickname: z.string().max(0).optional().or(z.literal("")),
});

export type ContactMessageInput = z.input<typeof contactMessageSchema>;
export type ContactMessagePayload = z.output<typeof contactMessageSchema>;
