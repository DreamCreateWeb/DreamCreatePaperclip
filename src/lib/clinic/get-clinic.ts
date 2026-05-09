import { eq } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { clinics, type Clinic } from "@/src/db/schema";

export async function getClinicBySlug(slug: string): Promise<Clinic | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getClinicIdBySlug(slug: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: clinics.id })
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);
  return rows[0]?.id ?? null;
}
