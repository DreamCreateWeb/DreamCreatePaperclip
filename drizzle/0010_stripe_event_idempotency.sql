CREATE TABLE "processed_stripe_events" (
	"stripe_event_id" text PRIMARY KEY NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "processed_stripe_events_processed_at_idx" ON "processed_stripe_events" USING btree ("processed_at");
