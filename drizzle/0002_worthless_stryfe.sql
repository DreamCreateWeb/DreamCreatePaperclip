CREATE TABLE "clinic_owner_login_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"requested_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinic_owner_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinic_owner_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinic_owner_sessions" ADD CONSTRAINT "clinic_owner_sessions_user_id_clinic_owner_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."clinic_owner_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_owner_users" ADD CONSTRAINT "clinic_owner_users_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_owner_login_tokens_token_hash_unique" ON "clinic_owner_login_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "clinic_owner_login_tokens_email_idx" ON "clinic_owner_login_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "clinic_owner_login_tokens_expires_idx" ON "clinic_owner_login_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_owner_sessions_token_hash_unique" ON "clinic_owner_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "clinic_owner_sessions_user_idx" ON "clinic_owner_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clinic_owner_sessions_expires_idx" ON "clinic_owner_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_owner_users_email_unique" ON "clinic_owner_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "clinic_owner_users_clinic_idx" ON "clinic_owner_users" USING btree ("clinic_id");