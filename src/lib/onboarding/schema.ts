import { z } from "zod";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
const PHONE_PATTERN = /^[0-9+\-().\s]{10,20}$/;
const ZIP_PATTERN = /^[0-9]{5}(?:-[0-9]{4})?$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined));

const optionalUrl = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .pipe(z.string().url().optional());

export const DAYS_OF_WEEK = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const SERVICE_CATALOG = [
  "General dentistry",
  "Cosmetic dentistry",
  "Teeth whitening",
  "Veneers",
  "Crowns & bridges",
  "Implants",
  "Invisalign",
  "Orthodontics",
  "Pediatric dentistry",
  "Periodontics",
  "Endodontics (root canals)",
  "Oral surgery",
  "Sedation dentistry",
  "Emergency care",
] as const;

export const addressSchema = z.object({
  line1: z.string().trim().min(2, "Street address is required").max(200),
  line2: optionalString(200),
  city: z.string().trim().min(2, "City is required").max(120),
  state: z
    .string()
    .trim()
    .length(2, "Use the two-letter state code")
    .toUpperCase()
    .default("AR"),
  postalCode: z
    .string()
    .trim()
    .regex(ZIP_PATTERN, "Enter a valid US ZIP code"),
});

export const brandSchema = z.object({
  primaryColor: z
    .string()
    .trim()
    .regex(HEX_COLOR, "Use a 6-digit hex like #0a3d2e"),
  accentColor: z
    .string()
    .trim()
    .regex(HEX_COLOR, "Use a 6-digit hex like #d8ebe2"),
  logoUrl: optionalUrl(500),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Service name is required").max(80),
  description: optionalString(280),
});

export const teamMemberSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  role: z.string().trim().min(2, "Role is required").max(120),
  bio: optionalString(280),
  photoUrl: optionalUrl(500),
});

export const hoursDaySchema = z
  .object({
    day: z.enum(DAYS_OF_WEEK),
    closed: z.boolean().default(false),
    open: z
      .string()
      .trim()
      .regex(TIME_PATTERN, "Use 24h time like 08:00")
      .optional(),
    close: z
      .string()
      .trim()
      .regex(TIME_PATTERN, "Use 24h time like 17:00")
      .optional(),
  })
  .refine(
    (h) => h.closed || (h.open && h.close),
    "Set open and close times, or mark closed",
  )
  .refine((h) => h.closed || !h.open || !h.close || h.open < h.close, {
    message: "Close time must be after open time",
  });

export const socialSchema = z
  .object({
    website: optionalUrl(300),
    facebook: optionalUrl(300),
    instagram: optionalUrl(300),
    google: optionalUrl(300),
  })
  .default({});

export const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Clinic name is required").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      SLUG_PATTERN,
      "Lowercase letters, numbers, and hyphens (3–40 chars)",
    )
    .optional()
    .or(z.literal("").transform(() => undefined)),
  contactName: z
    .string()
    .trim()
    .min(2, "Contact name is required")
    .max(120),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .max(200),
  contactPhone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, "Enter a valid US phone number"),
  address: addressSchema,
  brand: brandSchema,
  services: z
    .array(serviceSchema)
    .min(1, "Add at least one service")
    .max(20, "Up to 20 services"),
  team: z
    .array(teamMemberSchema)
    .min(1, "Add at least one team member")
    .max(40, "Up to 40 team members"),
  hours: z.array(hoursDaySchema).max(7).optional(),
  social: socialSchema.optional(),
  // Honeypot — bots tend to autofill any input named like a common field.
  // Real users never see this; legitimate submissions leave it empty.
  nickname: z
    .string()
    .max(0, "Spam check failed")
    .optional()
    .or(z.literal("")),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingPayload = z.output<typeof onboardingSchema>;

export type FieldErrors = Record<string, string[]>;

export function flattenZodErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
