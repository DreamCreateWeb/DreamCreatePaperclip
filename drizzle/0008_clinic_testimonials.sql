ALTER TABLE "clinics" ADD COLUMN "testimonials" jsonb DEFAULT '[]'::jsonb NOT NULL;
