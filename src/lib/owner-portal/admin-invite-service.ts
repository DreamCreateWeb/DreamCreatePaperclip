import { and, count, eq, inArray, ne } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { normalizeEmail } from "@/src/lib/auth/admins";
import { getMailer } from "@/src/lib/auth/mailer";
import {
  auditEvents,
  clinicOwnerUsers,
  clinics,
  type Clinic,
  type ClinicOwnerUser,
} from "@/src/db/schema";
import { issueOwnerLoginToken } from "@/src/lib/owner-auth/sessions";

export type InviteOwnerInput = {
  clinicId: string;
  email: string;
  adminEmail: string;
  appOrigin: string;
  ip: string | null;
};

export type InviteOwnerResult =
  | { ok: true; owner: ClinicOwnerUser; clinic: Clinic; replaced: boolean }
  | { ok: false; error: "clinic_not_found" | "email_taken_by_other_clinic" };

/**
 * Admin upsert: assign or replace the owner for a clinic and send a magic link.
 * Enforces "one email = one owner" by rejecting if the email is already linked
 * to a different clinic.
 */
export async function inviteClinicOwner(
  input: InviteOwnerInput,
): Promise<InviteOwnerResult> {
  const db = getDb();
  const email = normalizeEmail(input.email);

  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.id, input.clinicId))
    .limit(1);
  if (!clinic) return { ok: false, error: "clinic_not_found" };

  // Reject if the email already belongs to a different clinic.
  const [collision] = await db
    .select({ id: clinicOwnerUsers.id, clinicId: clinicOwnerUsers.clinicId })
    .from(clinicOwnerUsers)
    .where(
      and(
        eq(clinicOwnerUsers.email, email),
        ne(clinicOwnerUsers.clinicId, clinic.id),
      ),
    )
    .limit(1);
  if (collision) return { ok: false, error: "email_taken_by_other_clinic" };

  const { owner, replaced } = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(clinicOwnerUsers)
      .where(eq(clinicOwnerUsers.clinicId, clinic.id))
      .limit(1);

    let resolved: ClinicOwnerUser;
    let didReplace = false;
    if (existing && existing.email === email) {
      resolved = existing;
    } else if (existing) {
      const [updated] = await tx
        .update(clinicOwnerUsers)
        .set({ email, name: null, lastLoginAt: null })
        .where(eq(clinicOwnerUsers.id, existing.id))
        .returning();
      resolved = updated;
      didReplace = true;
    } else {
      const [created] = await tx
        .insert(clinicOwnerUsers)
        .values({ clinicId: clinic.id, email })
        .returning();
      resolved = created;
    }

    await tx.insert(auditEvents).values({
      actor: `admin:${input.adminEmail}`,
      action: didReplace ? "clinic.owner.replaced" : "clinic.owner.invited",
      entityType: "clinic",
      entityId: clinic.id,
      payload: { email, ownerId: resolved.id, replaced: didReplace },
    });

    return { owner: resolved, replaced: didReplace };
  });

  const { token } = await issueOwnerLoginToken(email, input.ip);
  const url = `${input.appOrigin}/api/owner/auth/callback?token=${encodeURIComponent(token)}`;
  await getMailer().sendOwnerLoginLink({
    to: email,
    url,
    clinicName: clinic.name,
  });

  return { ok: true, owner, clinic, replaced };
}

export async function listClinicOwners(): Promise<
  Array<{ clinic: Clinic; owner: ClinicOwnerUser | null }>
> {
  const db = getDb();
  const allClinics = await db
    .select()
    .from(clinics)
    .orderBy(clinics.createdAt);

  if (allClinics.length === 0) return [];

  const ownerRows = await db.select().from(clinicOwnerUsers);
  const ownersByClinic = new Map<string, ClinicOwnerUser>();
  for (const row of ownerRows) ownersByClinic.set(row.clinicId, row);

  return allClinics.map((clinic) => ({
    clinic,
    owner: ownersByClinic.get(clinic.id) ?? null,
  }));
}

export const CLINIC_LIST_PAGE_SIZE = 50;

export async function listClinicsAdminView(page: number): Promise<{
  rows: Array<{ clinic: Clinic; owner: ClinicOwnerUser | null }>;
  total: number;
  pageSize: number;
}> {
  const db = getDb();
  const offset = (page - 1) * CLINIC_LIST_PAGE_SIZE;

  const [totalResult, pageClinicRows] = await Promise.all([
    db.select({ value: count() }).from(clinics),
    db
      .select()
      .from(clinics)
      .orderBy(clinics.createdAt)
      .limit(CLINIC_LIST_PAGE_SIZE)
      .offset(offset),
  ]);

  const total = totalResult[0]?.value ?? 0;
  if (pageClinicRows.length === 0) {
    return { rows: [], total, pageSize: CLINIC_LIST_PAGE_SIZE };
  }

  const clinicIds = pageClinicRows.map((c) => c.id);
  const ownerRows = await db
    .select()
    .from(clinicOwnerUsers)
    .where(
      clinicIds.length === 1
        ? eq(clinicOwnerUsers.clinicId, clinicIds[0])
        : inArray(clinicOwnerUsers.clinicId, clinicIds),
    );

  const ownersByClinic = new Map<string, ClinicOwnerUser>();
  for (const row of ownerRows) ownersByClinic.set(row.clinicId, row);

  return {
    rows: pageClinicRows.map((clinic) => ({
      clinic,
      owner: ownersByClinic.get(clinic.id) ?? null,
    })),
    total,
    pageSize: CLINIC_LIST_PAGE_SIZE,
  };
}
