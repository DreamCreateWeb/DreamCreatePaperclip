CREATE TYPE "public"."clinic_status" AS ENUM('draft', 'pending_payment', 'provisioning', 'live', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."provisioning_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."provisioning_step" AS ENUM('clone', 'config', 'vercel_create', 'deploy');--> statement-breakpoint
CREATE TABLE "admin_login_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"requested_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"address" jsonb,
	"brand" jsonb,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"team" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "clinic_status" DEFAULT 'draft' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"repo_url" text,
	"vercel_project_id" text,
	"vercel_deployment_url" text,
	"custom_domain" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid,
	"payload" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provisioning_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"step" "provisioning_step" NOT NULL,
	"status" "provisioning_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_submissions" ADD CONSTRAINT "onboarding_submissions_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provisioning_runs" ADD CONSTRAINT "provisioning_runs_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_login_tokens_token_hash_unique" ON "admin_login_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_login_tokens_email_idx" ON "admin_login_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "admin_login_tokens_expires_idx" ON "admin_login_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_sessions_token_hash_unique" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_sessions_user_idx" ON "admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_sessions_expires_idx" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_unique" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor");--> statement-breakpoint
CREATE UNIQUE INDEX "clinics_slug_unique" ON "clinics" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "clinics_status_idx" ON "clinics" USING btree ("status");--> statement-breakpoint
CREATE INDEX "onboarding_submissions_clinic_idx" ON "onboarding_submissions" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "provisioning_runs_clinic_idx" ON "provisioning_runs" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "provisioning_runs_status_idx" ON "provisioning_runs" USING btree ("status");