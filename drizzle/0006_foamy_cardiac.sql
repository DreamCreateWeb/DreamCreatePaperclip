CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "uptime_monitor_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_clinic_idx" ON "leads" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "leads_clinic_created_idx" ON "leads" USING btree ("clinic_id","created_at");--> statement-breakpoint
CREATE INDEX "leads_clinic_unread_idx" ON "leads" USING btree ("clinic_id") WHERE read_at IS NULL;