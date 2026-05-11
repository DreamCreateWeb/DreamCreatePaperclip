import "dotenv/config";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { clinicOwnerUsers, clinics, intakeFormTemplates } from "../src/db/schema";
import { DEFAULT_INTAKE_SECTIONS } from "../src/lib/intake/default-template";

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

  const seededOwnerEmail = "hello@smilebright.example";
  const [seededClinic] = await db
    .select({ id: clinics.id })
    .from(clinics)
    .where(eq(clinics.slug, "smile-bright-rogers"))
    .limit(1);
  if (seededClinic) {
    const [owner] = await db
      .insert(clinicOwnerUsers)
      .values({
        clinicId: seededClinic.id,
        email: seededOwnerEmail,
        name: "Smile Bright Owner",
      })
      .onConflictDoNothing({ target: clinicOwnerUsers.email })
      .returning({ id: clinicOwnerUsers.id, email: clinicOwnerUsers.email });
    if (owner) {
      console.log(
        `Inserted clinic owner ${owner.email} for clinic ${seededClinic.id}.`,
      );
    } else {
      console.log("Clinic owner already seeded; skipped.");
    }
  }

  const [seededClinicForIntake] = await db
    .select({ id: clinics.id })
    .from(clinics)
    .where(eq(clinics.slug, "smile-bright-rogers"))
    .limit(1);
  if (seededClinicForIntake) {
    const [template] = await db
      .insert(intakeFormTemplates)
      .values({
        clinicId: seededClinicForIntake.id,
        name: "Patient Intake Form",
        sections: DEFAULT_INTAKE_SECTIONS,
        isActive: true,
      })
      .onConflictDoNothing()
      .returning({ id: intakeFormTemplates.id });
    if (template) {
      console.log(`Inserted default intake template ${template.id}.`);
    } else {
      console.log("Intake template already seeded; skipped.");
    }
  }

  // Orthodontics fixture clinic — preview for template-ortho
  const [orthoClinic] = await db
    .insert(clinics)
    .values({
      slug: "straight-smiles-fayetteville",
      name: "Straight Smiles Orthodontics",
      contactEmail: "hello@straightsmiles.example",
      contactPhone: "(479) 555-0199",
      address: {
        line1: "3400 N College Ave",
        city: "Fayetteville",
        state: "AR",
        postalCode: "72703",
      },
      brand: {
        primaryColor: "#0d4a8a",
        accentColor: "#d6eaff",
        template: "ortho",
      },
      services: [
        {
          name: "Invisalign",
          description:
            "Custom clear aligners that straighten teeth discreetly — removable for eating, sports, and photos.",
        },
        {
          name: "Traditional Braces",
          description:
            "Metal brackets and wires offer the most precise control for complex corrections. Reliable and affordable.",
        },
        {
          name: "Clear Braces",
          description:
            "Ceramic brackets that match your tooth color for a subtler look, with the same correction power as metal.",
        },
        {
          name: "Retainers",
          description:
            "Custom-fitted retainers keep your smile in place after treatment.",
        },
        {
          name: "Early Orthodontics",
          description:
            "Phase-1 treatment for children ages 7–10 that guides jaw development before all permanent teeth arrive.",
        },
        {
          name: "Teen Packages",
          description:
            "Flexible plans designed around school schedules, sports seasons, and social confidence.",
        },
      ],
      team: [
        {
          name: "Dr. Sarah Chen",
          role: "Lead Orthodontist",
          bio: "DDS, MS Orthodontics, University of Arkansas. Board-certified with 10+ years helping Northwest Arkansas smile.",
        },
        {
          name: "Dr. Marcus Webb",
          role: "Associate Orthodontist",
          bio: "DDS, specializing in Invisalign and complex bite correction.",
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
        website: "https://straightsmiles.example",
        facebook: "https://www.facebook.com/straightsmiles",
      },
      status: "draft",
    })
    .onConflictDoNothing({ target: clinics.slug })
    .returning({ id: clinics.id, slug: clinics.slug });

  if (orthoClinic) {
    console.log(
      `Inserted ortho fixture clinic ${orthoClinic.slug} (${orthoClinic.id}). Preview at /sites/${orthoClinic.slug}`,
    );
  } else {
    console.log("Ortho fixture clinic already seeded; skipped.");
  }

  // Pediatric fixture clinic — preview for template-pediatric
  const [pedClinic] = await db
    .insert(clinics)
    .values({
      slug: "happy-smiles-pediatrics",
      name: "Happy Smiles Pediatric Dentistry",
      contactEmail: "hello@happysmiles.example",
      contactPhone: "(479) 555-0168",
      address: {
        line1: "1250 S Walton Blvd",
        city: "Bentonville",
        state: "AR",
        postalCode: "72712",
      },
      brand: {
        primaryColor: "#c2185b",
        accentColor: "#ffe0f0",
        template: "pediatric",
      },
      services: [
        {
          name: "Preventive Cleaning",
          description:
            "Fun, gentle cleanings that teach kids about healthy teeth habits.",
        },
        {
          name: "Fluoride Treatment",
          description:
            "Protects growing teeth and prevents cavities with a light, minty flavor kids enjoy.",
        },
        {
          name: "Cavity Fillings",
          description:
            "Fast, comfortable treatment to repair cavities with kid-friendly comfort measures.",
        },
        {
          name: "Sealants",
          description:
            "Protective coating on back teeth to prevent cavities where toothbrushes can't reach.",
        },
        {
          name: "Habit Breaking",
          description:
            "Gentle guidance to help kids stop thumb sucking and other habits that affect smile development.",
        },
        {
          name: "Emergency Care",
          description:
            "Same-day relief for tooth pain, broken teeth, and other dental emergencies.",
        },
      ],
      team: [
        {
          name: "Dr. Emily Rodriguez",
          role: "Pediatric Dentist",
          bio: "DDS, MS Pediatric Dentistry, Baylor College of Dentistry. Certified in child behavior guidance and sedation.",
        },
        {
          name: "Kayla Patterson",
          role: "Pediatric Hygienist",
          bio: "RDH, certified in pediatric oral health. Loves making kids smile.",
        },
      ],
      hours: [
        { day: "mon", closed: false, open: "08:00", close: "17:00" },
        { day: "tue", closed: false, open: "08:00", close: "17:00" },
        { day: "wed", closed: false, open: "08:00", close: "17:00" },
        { day: "thu", closed: false, open: "08:00", close: "17:00" },
        { day: "fri", closed: false, open: "08:00", close: "16:00" },
        { day: "sat", closed: true },
        { day: "sun", closed: true },
      ],
      social: {
        website: "https://happysmiles.example",
        facebook: "https://www.facebook.com/happysmiles",
      },
      status: "draft",
    })
    .onConflictDoNothing({ target: clinics.slug })
    .returning({ id: clinics.id, slug: clinics.slug });

  if (pedClinic) {
    console.log(
      `Inserted pediatric fixture clinic ${pedClinic.slug} (${pedClinic.id}). Preview at /sites/${pedClinic.slug}`,
    );
  } else {
    console.log("Pediatric fixture clinic already seeded; skipped.");
  }

  await client.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  await client.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
});
