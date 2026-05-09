import { getDb } from "@/src/db/client";
import { auditEvents, clinicContactMessages } from "@/src/db/schema";

import type { ContactMessagePayload } from "./contact-schema";

export type StoredContactMessage = {
  id: string;
};

export async function storeContactMessage(
  clinicId: string,
  payload: ContactMessagePayload,
  meta: { ip: string | null; userAgent: string | null },
): Promise<StoredContactMessage> {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(clinicContactMessages)
      .values({
        clinicId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone ?? null,
        message: payload.message,
        submittedIp: meta.ip,
        userAgent: meta.userAgent,
      })
      .returning({ id: clinicContactMessages.id });

    await tx.insert(auditEvents).values({
      actor: "public",
      action: "clinic.contact.submitted",
      entityType: "clinic_contact_message",
      entityId: row.id,
      payload: {
        clinicId,
        ip: meta.ip,
      },
    });

    return { id: row.id };
  });
}
