CREATE TYPE "public"."review_status" AS ENUM('pending', 'published', 'hidden');--> statement-breakpoint
ALTER TYPE "public"."clinic_status" ADD VALUE 'past_due' BEFORE 'cancelled';--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"rating" smallint NOT NULL,
	"body" text NOT NULL,
	"service_tag" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"clinic_response" text,
	"responded_at" timestamp with time zone,
	"submitted_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "review_config" jsonb;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_clinic_idx" ON "reviews" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "reviews_clinic_status_idx" ON "reviews" USING btree ("clinic_id","status");