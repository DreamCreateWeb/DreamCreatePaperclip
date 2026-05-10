CREATE TYPE "public"."intake_submission_status" AS ENUM('pending', 'reviewed', 'archived');--> statement-breakpoint
CREATE TABLE "intake_form_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"appointment_id" uuid,
	"template_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"patient_email" text NOT NULL,
	"patient_dob" text,
	"responses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "intake_submission_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_owner_id" uuid,
	"reviewed_at" timestamp with time zone,
	"submitted_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "intake_form_templates" ADD CONSTRAINT "intake_form_templates_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_template_id_intake_form_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."intake_form_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_reviewed_by_owner_id_clinic_owner_users_id_fk" FOREIGN KEY ("reviewed_by_owner_id") REFERENCES "public"."clinic_owner_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intake_form_templates_clinic_idx" ON "intake_form_templates" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "intake_form_templates_clinic_active_idx" ON "intake_form_templates" USING btree ("clinic_id","is_active");--> statement-breakpoint
CREATE INDEX "intake_submissions_clinic_idx" ON "intake_submissions" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "intake_submissions_clinic_status_idx" ON "intake_submissions" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "intake_submissions_template_idx" ON "intake_submissions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "intake_submissions_appointment_idx" ON "intake_submissions" USING btree ("appointment_id");
