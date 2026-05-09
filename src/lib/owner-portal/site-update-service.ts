import { eq } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { auditEvents, clinics } from "@/src/db/schema";

import type { SiteUpdatePayload } from "./site-update-schema";

export async function applySiteUpdate(
  clinicId: string,
  ownerUserId: string,
  payload: SiteUpdatePayload,
): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(clinics)
      .set({
        name: payload.name,
        contactPhone: payload.contactPhone,
        address: payload.address,
        hours: payload.hours,
        social: payload.social,
        updatedAt: new Date(),
      })
      .where(eq(clinics.id, clinicId));

    await tx.insert(auditEvents).values({
      actor: `clinic_owner:${ownerUserId}`,
      action: "clinic.site.updated",
      entityType: "clinic",
      entityId: clinicId,
      payload: {
        fields: ["name", "contactPhone", "address", "hours", "social"],
      },
    });
  });
}
