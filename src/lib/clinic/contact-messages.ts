import { count, desc, eq } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import {
  clinicContactMessages,
  type ClinicContactMessage,
} from "@/src/db/schema";

export async function listContactMessages(
  clinicId: string,
  limit = 100,
): Promise<ClinicContactMessage[]> {
  const db = getDb();
  return db
    .select()
    .from(clinicContactMessages)
    .where(eq(clinicContactMessages.clinicId, clinicId))
    .orderBy(desc(clinicContactMessages.createdAt))
    .limit(limit);
}

export async function countContactMessages(clinicId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(clinicContactMessages)
    .where(eq(clinicContactMessages.clinicId, clinicId));
  return Number(row?.value ?? 0);
}
