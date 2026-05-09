import { eq } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import {
  auditEvents,
  clinics,
  type ClinicBrand,
  type ClinicService,
  type ClinicTeamMember,
} from "@/src/db/schema";

type Actor = { ownerUserId: string; clinicId: string };

async function applyAndAudit<T extends Record<string, unknown>>(
  actor: Actor,
  patch: T,
  fields: string[],
  action: string,
): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(clinics)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(clinics.id, actor.clinicId));
    await tx.insert(auditEvents).values({
      actor: `clinic_owner:${actor.ownerUserId}`,
      action,
      entityType: "clinic",
      entityId: actor.clinicId,
      payload: { fields },
    });
  });
}

export async function applyServicesUpdate(
  actor: Actor,
  services: ClinicService[],
): Promise<void> {
  await applyAndAudit(
    actor,
    { services },
    ["services"],
    "clinic.services.updated",
  );
}

export async function applyTeamUpdate(
  actor: Actor,
  team: ClinicTeamMember[],
): Promise<void> {
  await applyAndAudit(actor, { team }, ["team"], "clinic.team.updated");
}

export async function applyBrandUpdate(
  actor: Actor,
  brand: ClinicBrand,
): Promise<void> {
  await applyAndAudit(actor, { brand }, ["brand"], "clinic.brand.updated");
}

export async function applyContactEmailUpdate(
  actor: Actor,
  contactEmail: string,
): Promise<void> {
  await applyAndAudit(
    actor,
    { contactEmail },
    ["contactEmail"],
    "clinic.contactEmail.updated",
  );
}
