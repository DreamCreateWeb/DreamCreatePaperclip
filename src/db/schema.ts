import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const clinicStatus = pgEnum("clinic_status", [
  "draft",
  "pending_payment",
  "provisioning",
  "live",
  "paused",
  "past_due",
  "cancelled",
]);

export const provisioningStep = pgEnum("provisioning_step", [
  "clone",
  "config",
  "vercel_create",
  "deploy",
]);

export const provisioningStatus = pgEnum("provisioning_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const appointmentStatus = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const reviewStatus = pgEnum("review_status", [
  "pending",
  "published",
  "hidden",
]);

export const intakeSubmissionStatus = pgEnum("intake_submission_status", [
  "pending",
  "reviewed",
  "archived",
]);

export type IntakeFieldType =
  | "text"
  | "email"
  | "tel"
  | "date"
  | "textarea"
  | "checkbox"
  | "checklist";

export type IntakeField = {
  key: string;
  label: string;
  type: IntakeFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

export type IntakeSection = {
  key: string;
  title: string;
  fields: IntakeField[];
};

export type ClinicAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
};

export type ClinicTemplate = "warm" | "modern";

export type ClinicBrand = {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  template?: ClinicTemplate;
};

export type ClinicService = {
  name: string;
  description?: string;
};

export type ClinicTeamMember = {
  name: string;
  role: string;
  bio?: string;
  photoUrl?: string;
};

export type BeforeAfterPair = {
  label: string;
  before: { src: string; alt: string };
  after: { src: string; alt: string };
};

export type Testimonial = {
  name: string;
  photo?: string;
  rating: number;
  quote: string;
  treatmentType?: string;
};

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

export type ClinicHoursDay = {
  day: DayOfWeek;
  closed: boolean;
  open?: string;
  close?: string;
};
export type ClinicHours = ClinicHoursDay[];

export type ClinicSocial = {
  website?: string;
  facebook?: string;
  instagram?: string;
  google?: string;
};

export type ClinicBookingConfig = {
  enabled: boolean;
  slotMinutes: number;
  bufferMinutes: number;
  leadTimeHours: number;
  maxDaysAhead: number;
  timezone: string;
};

export const DEFAULT_BOOKING_CONFIG: ClinicBookingConfig = {
  enabled: true,
  slotMinutes: 30,
  bufferMinutes: 0,
  leadTimeHours: 24,
  maxDaysAhead: 60,
  timezone: "America/Chicago",
};

export type ClinicReviewConfig = {
  enabled: boolean;
  autoPublish: boolean;
};

export const DEFAULT_REVIEW_CONFIG: ClinicReviewConfig = {
  enabled: true,
  autoPublish: false,
};

export const clinics = pgTable(
  "clinics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    address: jsonb("address").$type<ClinicAddress>(),
    brand: jsonb("brand").$type<ClinicBrand>(),
    services: jsonb("services").$type<ClinicService[]>().notNull().default([]),
    team: jsonb("team").$type<ClinicTeamMember[]>().notNull().default([]),
    hours: jsonb("hours").$type<ClinicHours>(),
    social: jsonb("social").$type<ClinicSocial>(),
    bookingConfig: jsonb("booking_config").$type<ClinicBookingConfig>(),
    reviewConfig: jsonb("review_config").$type<ClinicReviewConfig>(),
    beforeAfterPairs: jsonb("before_after_pairs").$type<BeforeAfterPair[]>(),
    testimonials: jsonb("testimonials").$type<Testimonial[]>().notNull().default([]),
    status: clinicStatus("status").notNull().default("draft"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    repoUrl: text("repo_url"),
    vercelProjectId: text("vercel_project_id"),
    vercelDeploymentUrl: text("vercel_deployment_url"),
    customDomain: text("custom_domain"),
    uptimeMonitorId: text("uptime_monitor_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("clinics_slug_unique").on(t.slug),
    index("clinics_status_idx").on(t.status),
  ],
);

export const clinicContactMessages = pgTable(
  "clinic_contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    message: text("message").notNull(),
    submittedIp: text("submitted_ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("clinic_contact_messages_clinic_idx").on(t.clinicId),
    index("clinic_contact_messages_created_idx").on(t.createdAt),
  ],
);

export const onboardingSubmissions = pgTable(
  "onboarding_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").references(() => clinics.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("onboarding_submissions_clinic_idx").on(t.clinicId)],
);

export const provisioningRuns = pgTable(
  "provisioning_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    step: provisioningStep("step").notNull(),
    status: provisioningStatus("status").notNull().default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("provisioning_runs_clinic_idx").on(t.clinicId),
    index("provisioning_runs_status_idx").on(t.status),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_events_entity_idx").on(t.entityType, t.entityId),
    index("audit_events_actor_idx").on(t.actor),
  ],
);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("admin_users_email_unique").on(t.email)],
);

export const adminLoginTokens = pgTable(
  "admin_login_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    requestedIp: text("requested_ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("admin_login_tokens_token_hash_unique").on(t.tokenHash),
    index("admin_login_tokens_email_idx").on(t.email),
    index("admin_login_tokens_expires_idx").on(t.expiresAt),
  ],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("admin_sessions_token_hash_unique").on(t.tokenHash),
    index("admin_sessions_user_idx").on(t.userId),
    index("admin_sessions_expires_idx").on(t.expiresAt),
  ],
);

export const clinicOwnerUsers = pgTable(
  "clinic_owner_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("clinic_owner_users_email_unique").on(t.email),
    index("clinic_owner_users_clinic_idx").on(t.clinicId),
  ],
);

export const clinicOwnerLoginTokens = pgTable(
  "clinic_owner_login_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    requestedIp: text("requested_ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("clinic_owner_login_tokens_token_hash_unique").on(t.tokenHash),
    index("clinic_owner_login_tokens_email_idx").on(t.email),
    index("clinic_owner_login_tokens_expires_idx").on(t.expiresAt),
  ],
);

export const clinicOwnerSessions = pgTable(
  "clinic_owner_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => clinicOwnerUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("clinic_owner_sessions_token_hash_unique").on(t.tokenHash),
    index("clinic_owner_sessions_user_idx").on(t.userId),
    index("clinic_owner_sessions_expires_idx").on(t.expiresAt),
  ],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    serviceName: text("service_name").notNull(),
    patientName: text("patient_name").notNull(),
    patientEmail: text("patient_email").notNull(),
    patientPhone: text("patient_phone"),
    notes: text("notes"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatus("status").notNull().default("pending"),
    confirmationToken: text("confirmation_token").notNull(),
    submittedIp: text("submitted_ip"),
    userAgent: text("user_agent"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("appointments_clinic_idx").on(t.clinicId),
    index("appointments_clinic_starts_idx").on(t.clinicId, t.startsAt),
    index("appointments_status_idx").on(t.status),
    uniqueIndex("appointments_confirmation_token_unique").on(t.confirmationToken),
    uniqueIndex("appointments_no_double_booking_idx")
      .on(t.clinicId, t.startsAt)
      .where(sql`status <> 'cancelled'`),
  ],
);

export type Clinic = typeof clinics.$inferSelect;
export type NewClinic = typeof clinics.$inferInsert;
export type OnboardingSubmission = typeof onboardingSubmissions.$inferSelect;
export type NewOnboardingSubmission =
  typeof onboardingSubmissions.$inferInsert;
export type ProvisioningRun = typeof provisioningRuns.$inferSelect;
export type NewProvisioningRun = typeof provisioningRuns.$inferInsert;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type AdminLoginToken = typeof adminLoginTokens.$inferSelect;
export type NewAdminLoginToken = typeof adminLoginTokens.$inferInsert;
export type AdminSession = typeof adminSessions.$inferSelect;
export type NewAdminSession = typeof adminSessions.$inferInsert;
export type ClinicContactMessage = typeof clinicContactMessages.$inferSelect;
export type NewClinicContactMessage = typeof clinicContactMessages.$inferInsert;
export type ClinicOwnerUser = typeof clinicOwnerUsers.$inferSelect;
export type NewClinicOwnerUser = typeof clinicOwnerUsers.$inferInsert;
export type ClinicOwnerLoginToken = typeof clinicOwnerLoginTokens.$inferSelect;
export type NewClinicOwnerLoginToken =
  typeof clinicOwnerLoginTokens.$inferInsert;
export type ClinicOwnerSession = typeof clinicOwnerSessions.$inferSelect;
export type NewClinicOwnerSession = typeof clinicOwnerSessions.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type AppointmentStatus = (typeof appointmentStatus.enumValues)[number];

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientName: text("patient_name").notNull(),
    rating: smallint("rating").notNull(),
    body: text("body").notNull(),
    serviceTag: text("service_tag"),
    status: reviewStatus("status").notNull().default("pending"),
    clinicResponse: text("clinic_response"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    submittedIp: text("submitted_ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reviews_clinic_idx").on(t.clinicId),
    index("reviews_clinic_status_idx").on(t.clinicId, t.status),
  ],
);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type ReviewStatus = (typeof reviewStatus.enumValues)[number];

export const intakeFormTemplates = pgTable(
  "intake_form_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sections: jsonb("sections").$type<IntakeSection[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("intake_form_templates_clinic_idx").on(t.clinicId),
    index("intake_form_templates_clinic_active_idx").on(t.clinicId, t.isActive),
  ],
);

export const intakeSubmissions = pgTable(
  "intake_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => intakeFormTemplates.id, { onDelete: "restrict" }),
    patientName: text("patient_name").notNull(),
    patientEmail: text("patient_email").notNull(),
    patientDob: text("patient_dob"),
    responses: text("responses").notNull(),
    status: intakeSubmissionStatus("status").notNull().default("pending"),
    reviewedByOwnerId: uuid("reviewed_by_owner_id").references(
      () => clinicOwnerUsers.id,
      { onDelete: "set null" },
    ),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    submittedIp: text("submitted_ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("intake_submissions_clinic_idx").on(t.clinicId),
    index("intake_submissions_clinic_status_idx").on(t.clinicId, t.status),
    index("intake_submissions_template_idx").on(t.templateId),
    index("intake_submissions_appointment_idx").on(t.appointmentId),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    message: text("message").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("leads_clinic_idx").on(t.clinicId),
    index("leads_clinic_created_idx").on(t.clinicId, t.createdAt),
    index("leads_clinic_unread_idx")
      .on(t.clinicId)
      .where(sql`read_at IS NULL`),
  ],
);

export type IntakeFormTemplate = typeof intakeFormTemplates.$inferSelect;
export type NewIntakeFormTemplate = typeof intakeFormTemplates.$inferInsert;
export type IntakeSubmission = typeof intakeSubmissions.$inferSelect;
export type NewIntakeSubmission = typeof intakeSubmissions.$inferInsert;
export type IntakeSubmissionStatus =
  (typeof intakeSubmissionStatus.enumValues)[number];
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
