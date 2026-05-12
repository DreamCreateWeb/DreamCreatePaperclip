CREATE TABLE "onboarding_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"last_step" smallint NOT NULL DEFAULT 1,
	"link_expires_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"email_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_drafts_email_unique" ON "onboarding_drafts" USING btree ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_drafts_token_hash_unique" ON "onboarding_drafts" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "onboarding_drafts_expires_idx" ON "onboarding_drafts" USING btree ("expires_at");
