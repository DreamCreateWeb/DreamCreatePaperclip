import { and, ne } from "drizzle-orm";
import { eq } from "drizzle-orm";

import { getDb, schema } from "@/src/db/client";
import { provisionClinic } from "./provision-clinic";

export async function runProvisioning(clinicId: string): Promise<void> {
  const db = getDb();

  const [activeRun] = await db
    .select()
    .from(schema.provisioningRuns)
    .where(
      and(
        eq(schema.provisioningRuns.clinicId, clinicId),
        ne(schema.provisioningRuns.status, "failed"),
      ),
    )
    .limit(1);

  if (activeRun) return;

  await provisionClinic(clinicId);
}
