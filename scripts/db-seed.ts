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
        {
          name: "General Dentistry",
          description:
            "Routine cleanings, exams, fillings, and preventive care for the whole family.",
        },
        {
          name: "Cosmetic Dentistry",
          description:
            "Whitening, veneers, and bonding to restore a confident smile.",
        },
        {
          name: "Pediatric Care",
          description:
            "Gentle, age-appropriate dentistry that helps kids build healthy habits early.",
        },
      ],
      team: [
        {
          name: "Dr. Jane Doe",
          role: "Lead Dentist",
          bio: "DDS, University of Arkansas. Twelve years building Rogers smiles.",
        },
        {
          name: "Dr. John Smith",
          role: "Associate Dentist",
          bio: "DDS, focused on cosmetic and restorative dentistry.",
        },
      ],
      hours: [
        { day: "mon", closed: false, open: "08:00", close: "17:00" },
        { day: "tue", closed: false, open: "08:00", close: "17:00" },
        { day: "wed", closed: false, open: "08:00", close: "17:00" },
        { day: "thu", closed: false, open: "08:00", close: "17:00" },
        { day: "fri", closed: false, open: "08:00", close: "14:00" },
        { day: "sat", closed: true },
        { day: "sun", closed: true },
      ],
      social: {
        website: "https://smilebright.example",
        facebook: "https://www.facebook.com/smilebright",
        google: "https://maps.google.com/?cid=smilebright",
      },
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
