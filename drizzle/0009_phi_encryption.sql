-- Change responses column from jsonb to text for AES-256-GCM encrypted PHI storage.
-- Safe: zero real patient records exist at time of migration.
ALTER TABLE "intake_submissions" ALTER COLUMN "responses" TYPE text USING NULL;
ALTER TABLE "intake_submissions" ALTER COLUMN "responses" SET DEFAULT '';
