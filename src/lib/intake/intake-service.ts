import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import {
  auditEvents,
  clinics,
  intakeFormTemplates,
  intakeSubmissions,
  type IntakeFormTemplate,
  type IntakeSubmission,
  type IntakeSubmissionStatus,
} from "@/src/db/schema";

import { DEFAULT_INTAKE_SECTIONS } from "./default-template";
import { notifyOwnerNewIntakeSubmission } from "./notify";
import type { IntakeSubmitPayload } from "./intake-schema";

export async function getActiveTemplateForClinic(
  clinicId: string,
): Promise<IntakeFormTemplate | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(intakeFormTemplates)
    .where(
      and(
        eq(intakeFormTemplates.clinicId, clinicId),
        eq(intakeFormTemplates.isActive, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function ensureDefaultTemplate(
  clinicId: string,
): Promise<IntakeFormTemplate> {
  const existing = await getActiveTemplateForClinic(clinicId);
  if (existing) return existing;
  const db = getDb();
  const [row] = await db
    .insert(intakeFormTemplates)
    .values({
      clinicId,
      name: "Patient Intake Form",
      sections: DEFAULT_INTAKE_SECTIONS,
      isActive: true,
    })
    .returning();
  return row;
}

export async function createIntakeSubmission(
  clinicId: string,
  templateId: string,
  payload: IntakeSubmitPayload,
  meta: { ip: string | null },
): Promise<IntakeSubmission> {
  const db = getDb();
  const [row] = await db
    .insert(intakeSubmissions)
    .values({
      clinicId,
      templateId,
      appointmentId: payload.appointmentId ?? null,
      patientName: payload.patientName,
      patientEmail: payload.patientEmail.toLowerCase(),
      patientDob: payload.patientDob ?? null,
      responses: payload.responses,
      status: "pending",
      submittedIp: meta.ip,
    })
    .returning();

  await db.insert(auditEvents).values({
    actor: "public",
    action: "clinic.intake.submitted",
    entityType: "intake_submission",
    entityId: row.id,
    payload: { clinicId, templateId },
  });

  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  if (clinic) {
    await notifyOwnerNewIntakeSubmission(clinic, row).catch((err) => {
      console.error("Failed to send intake notification:", err);
    });
  }

  return row;
}

export async function listIntakeSubmissionsForClinic(
  clinicId: string,
  options: { statuses?: IntakeSubmissionStatus[]; limit?: number } = {},
): Promise<IntakeSubmission[]> {
  const db = getDb();
  const conds = [eq(intakeSubmissions.clinicId, clinicId)];
  if (options.statuses && options.statuses.length > 0) {
    conds.push(inArray(intakeSubmissions.status, options.statuses));
  }
  return db
    .select()
    .from(intakeSubmissions)
    .where(and(...conds))
    .orderBy(desc(intakeSubmissions.createdAt))
    .limit(options.limit ?? 200);
}

export async function getIntakeSubmissionById(
  id: string,
): Promise<IntakeSubmission | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateIntakeSubmissionStatus(
  id: string,
  clinicId: string,
  ownerUserId: string,
  status: IntakeSubmissionStatus,
): Promise<IntakeSubmission | null> {
  const db = getDb();
  const now = new Date();
  const result = await db
    .update(intakeSubmissions)
    .set({
      status,
      reviewedByOwnerId: status === "reviewed" ? ownerUserId : undefined,
      reviewedAt: status === "reviewed" ? now : undefined,
    })
    .where(
      and(
        eq(intakeSubmissions.id, id),
        eq(intakeSubmissions.clinicId, clinicId),
      ),
    )
    .returning();
  const row = result[0];
  if (!row) return null;

  await db.insert(auditEvents).values({
    actor: `clinic_owner:${ownerUserId}`,
    action: `clinic.intake.${status}`,
    entityType: "intake_submission",
    entityId: id,
    payload: { clinicId, status },
  });

  return row;
}

export async function logIntakeSubmissionView(
  submissionId: string,
  clinicId: string,
  ownerUserId: string,
): Promise<void> {
  const db = getDb();
  await db.insert(auditEvents).values({
    actor: `clinic_owner:${ownerUserId}`,
    action: "clinic.intake.viewed",
    entityType: "intake_submission",
    entityId: submissionId,
    payload: { clinicId },
  });
}
