CREATE TABLE "clinic_contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"submitted_ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "hours" jsonb;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "social" jsonb;--> statement-breakpoint
ALTER TABLE "clinic_contact_messages" ADD CONSTRAINT "clinic_contact_messages_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinic_contact_messages_clinic_idx" ON "clinic_contact_messages" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "clinic_contact_messages_created_idx" ON "clinic_contact_messages" USING btree ("created_at");