import { and, asc, count, desc, eq, gt, gte, inArray, lt, ne } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import {
  appointments,
  auditEvents,
  type Appointment,
  type AppointmentStatus,
  type Clinic,
} from "@/src/db/schema";
import { randomToken } from "@/src/lib/auth/crypto";

import { resolveBookingConfig } from "./booking-config";
import type { BookingRequestPayload } from "./booking-schema";

export type BookingFailure =
  | { ok: false; reason: "booking_disabled" }
  | { ok: false; reason: "service_unknown" }
  | { ok: false; reason: "slot_invalid" }
  | { ok: false; reason: "slot_unavailable" }
  | { ok: false; reason: "out_of_hours" };

export type BookingSuccess = {
  ok: true;
  appointment: Appointment;
};

const ACTIVE_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "no_show",
];

export async function createBooking(
  clinic: Pick<
    Clinic,
    "id" | "services" | "hours" | "bookingConfig"
  >,
  payload: BookingRequestPayload,
  meta: { ip: string | null; userAgent: string | null },
): Promise<BookingSuccess | BookingFailure> {
  const config = resolveBookingConfig(clinic);
  if (!config.enabled) return { ok: false, reason: "booking_disabled" };

  const service = clinic.services.find(
    (s) => s.name.toLowerCase() === payload.serviceName.toLowerCase(),
  );
  if (!service) return { ok: false, reason: "service_unknown" };

  const startsAt = new Date(payload.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { ok: false, reason: "slot_invalid" };

  // Slot must align to a slotMinutes boundary from epoch (matches generator).
  const slotMs = config.slotMinutes * 60_000;
  if (startsAt.getTime() % slotMs !== 0) {
    // Allow non-aligned only if generator placed it there; we re-derive based on
    // clinic-local minute alignment. For MVP, enforce alignment to the minute.
    if (startsAt.getTime() % 60_000 !== 0) {
      return { ok: false, reason: "slot_invalid" };
    }
  }

  const endsAt = new Date(startsAt.getTime() + slotMs);
  const leadCutoff = new Date(Date.now() + config.leadTimeHours * 3_600_000);
  if (startsAt.getTime() < leadCutoff.getTime()) {
    return { ok: false, reason: "slot_unavailable" };
  }
  const horizon = new Date(Date.now() + config.maxDaysAhead * 86_400_000);
  if (startsAt.getTime() > horizon.getTime()) {
    return { ok: false, reason: "slot_unavailable" };
  }

  const db = getDb();
  const confirmationToken = randomToken(24);

  try {
    const [row] = await db
      .insert(appointments)
      .values({
        clinicId: clinic.id,
        serviceName: service.name,
        patientName: payload.patientName,
        patientEmail: payload.patientEmail.toLowerCase(),
        patientPhone: payload.patientPhone,
        notes: payload.notes,
        startsAt,
        endsAt,
        status: "pending",
        confirmationToken,
        submittedIp: meta.ip,
        userAgent: meta.userAgent,
      })
      .returning();

    await db.insert(auditEvents).values({
      actor: "public",
      action: "clinic.booking.requested",
      entityType: "appointment",
      entityId: row.id,
      payload: {
        clinicId: clinic.id,
        serviceName: service.name,
        startsAt: startsAt.toISOString(),
      },
    });

    return { ok: true, appointment: row };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, reason: "slot_unavailable" };
    }
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  return code === "23505";
}

export async function listAppointmentsForClinic(
  clinicId: string,
  options: { from?: Date; to?: Date; statuses?: AppointmentStatus[]; limit?: number } = {},
): Promise<Appointment[]> {
  const db = getDb();
  const conds = [eq(appointments.clinicId, clinicId)];
  if (options.from) conds.push(gte(appointments.startsAt, options.from));
  if (options.to) conds.push(lt(appointments.startsAt, options.to));
  if (options.statuses && options.statuses.length > 0) {
    conds.push(inArray(appointments.status, options.statuses));
  }
  return db
    .select()
    .from(appointments)
    .where(and(...conds))
    .orderBy(asc(appointments.startsAt))
    .limit(options.limit ?? 500);
}

export async function listRecentBookings(
  clinicId: string,
  limit = 100,
): Promise<Appointment[]> {
  const db = getDb();
  return db
    .select()
    .from(appointments)
    .where(eq(appointments.clinicId, clinicId))
    .orderBy(desc(appointments.startsAt))
    .limit(limit);
}

export async function countUpcomingBookings(
  clinicId: string,
  now: Date = new Date(),
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        ne(appointments.status, "cancelled"),
        gt(appointments.startsAt, now),
      ),
    );
  return Number(row?.value ?? 0);
}

export async function getAppointmentById(
  id: string,
): Promise<Appointment | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateAppointmentStatus(
  id: string,
  clinicId: string,
  ownerUserId: string,
  status: AppointmentStatus,
): Promise<Appointment | null> {
  const db = getDb();
  const now = new Date();
  const update: Partial<typeof appointments.$inferInsert> = {
    status,
    updatedAt: now,
  };
  if (status === "confirmed") update.confirmedAt = now;
  if (status === "cancelled") update.cancelledAt = now;
  if (status === "completed") update.completedAt = now;

  const result = await db
    .update(appointments)
    .set(update)
    .where(and(eq(appointments.id, id), eq(appointments.clinicId, clinicId)))
    .returning();
  const row = result[0];
  if (!row) return null;

  await db.insert(auditEvents).values({
    actor: `clinic_owner:${ownerUserId}`,
    action: `clinic.booking.${status}`,
    entityType: "appointment",
    entityId: id,
    payload: { clinicId, status },
  });
  return row;
}

export { ACTIVE_STATUSES };
