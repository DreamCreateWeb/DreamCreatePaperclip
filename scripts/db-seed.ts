import "dotenv/config";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { clinics } from "../src/db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "DATABASE_URL is not set. Add it to .env (Railway Postgres or local docker-compose).",
  );
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1, prepare: false });
const db = drizzle(client);

async function main() {
  console.log("Seeding local development data ...");

  const [clinic] = await db
    .insert(clinics)
    .values({
      slug: "smile-bright-rogers",
      name: "Smile Bright Family Dentistry",
      contactEmail: "hello@smilebright.example",
      contactPhone: "(479) 555-0142",
      address: {
        line1: "1200 W Walnut St",
        city: "Rogers",
        state: "AR",
        postalCode: "72756",
      },
      brand: {
        primaryColor: "#0E5E6F",
        secondaryColor: "#F2A285",
        accentColor: "#1B1B1F",
      },
      services: [
        { name: "General Dentistry" },
        { name: "Cosmetic Dentistry" },
        { name: "Pediatric Care" },
      ],
      team: [
        { name: "Dr. Jane Doe", role: "Lead Dentist" },
        { name: "Dr. John Smith", role: "Associate Dentist" },
      ],
      status: "draft",
    })
    .onConflictDoNothing({ target: clinics.slug })
    .returning({ id: clinics.id, slug: clinics.slug });

  if (clinic) {
    console.log(`Inserted clinic ${clinic.slug} (${clinic.id}).`);
  } else {
    console.log("Clinic already seeded; skipped.");
  }

  await client.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  await client.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
});
