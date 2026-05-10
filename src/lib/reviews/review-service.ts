import { and, avg, count, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import {
  auditEvents,
  reviews,
  DEFAULT_REVIEW_CONFIG,
  type Clinic,
  type Review,
  type ReviewStatus,
} from "@/src/db/schema";

export type ReviewSubmitPayload = {
  patientName: string;
  rating: number;
  body: string;
  serviceTag?: string;
};

export type ReviewFailure = { ok: false; reason: "reviews_disabled" };
export type ReviewSuccess = { ok: true; review: Review };

export async function submitReview(
  clinic: Pick<Clinic, "id" | "reviewConfig">,
  payload: ReviewSubmitPayload,
  meta: { ip: string | null },
): Promise<ReviewSuccess | ReviewFailure> {
  const config = clinic.reviewConfig ?? DEFAULT_REVIEW_CONFIG;
  if (!config.enabled) return { ok: false, reason: "reviews_disabled" };

  const db = getDb();
  const status = config.autoPublish ? "published" : "pending";

  const [row] = await db
    .insert(reviews)
    .values({
      clinicId: clinic.id,
      patientName: payload.patientName,
      rating: payload.rating,
      body: payload.body,
      serviceTag: payload.serviceTag ?? null,
      status,
      submittedIp: meta.ip,
    })
    .returning();

  await db.insert(auditEvents).values({
    actor: "public",
    action: "clinic.review.submitted",
    entityType: "review",
    entityId: row.id,
    payload: { clinicId: clinic.id, status },
  });

  return { ok: true, review: row };
}

export async function listPublishedReviews(clinicId: string): Promise<Review[]> {
  const db = getDb();
  return db
    .select()
    .from(reviews)
    .where(and(eq(reviews.clinicId, clinicId), eq(reviews.status, "published")))
    .orderBy(desc(reviews.createdAt))
    .limit(100);
}

export async function listReviewsForClinic(
  clinicId: string,
  statuses?: ReviewStatus[],
): Promise<Review[]> {
  const db = getDb();
  const conds = [eq(reviews.clinicId, clinicId)];
  if (statuses && statuses.length > 0) {
    conds.push(inArray(reviews.status, statuses));
  }
  return db
    .select()
    .from(reviews)
    .where(and(...conds))
    .orderBy(desc(reviews.createdAt))
    .limit(500);
}

export async function getReviewStats(
  clinicId: string,
): Promise<{ avgRating: number; reviewCount: number }> {
  const db = getDb();
  const [row] = await db
    .select({ avg: avg(reviews.rating), count: count() })
    .from(reviews)
    .where(and(eq(reviews.clinicId, clinicId), eq(reviews.status, "published")));
  return {
    avgRating: row?.avg ? Math.round(Number(row.avg) * 10) / 10 : 0,
    reviewCount: Number(row?.count ?? 0),
  };
}

export async function getReviewById(id: string): Promise<Review | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateReview(
  id: string,
  clinicId: string,
  ownerUserId: string,
  update: { status?: ReviewStatus; clinicResponse?: string | null },
): Promise<Review | null> {
  const db = getDb();
  const now = new Date();
  const values: Partial<typeof reviews.$inferInsert> = { updatedAt: now };
  if (update.status !== undefined) values.status = update.status;
  if ("clinicResponse" in update) {
    values.clinicResponse = update.clinicResponse ?? null;
    values.respondedAt = update.clinicResponse ? now : null;
  }

  const result = await db
    .update(reviews)
    .set(values)
    .where(and(eq(reviews.id, id), eq(reviews.clinicId, clinicId)))
    .returning();
  const row = result[0];
  if (!row) return null;

  await db.insert(auditEvents).values({
    actor: `clinic_owner:${ownerUserId}`,
    action: "clinic.review.updated",
    entityType: "review",
    entityId: id,
    payload: { clinicId, ...update },
  });

  return row;
}
