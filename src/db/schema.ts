import {
  index,
  jsonb,
  pgEnum,
  pgTable,
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

export type ClinicAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
};

export type ClinicBrand = {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
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
    status: clinicStatus("status").notNull().default("draft"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    repoUrl: text("repo_url"),
    vercelProjectId: text("vercel_project_id"),
    vercelDeploymentUrl: text("vercel_deployment_url"),
    customDomain: text("custom_domain"),
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
