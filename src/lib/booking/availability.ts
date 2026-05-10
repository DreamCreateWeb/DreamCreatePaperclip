import { and, eq, gte, lt, ne } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import {
  appointments,
  type Clinic,
  type ClinicHoursDay,
  type DayOfWeek,
} from "@/src/db/schema";

import { resolveBookingConfig } from "./booking-config";
import {
  dayOfWeekInZone,
  parseDateKey,
  parseTimeOfDay,
  zonedTimeToUtc,
} from "./timezone";

const DAY_INDEX_TO_KEY: DayOfWeek[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export type AvailableSlot = {
  /** ISO timestamp for the slot start (UTC). */
  startsAt: string;
  /** ISO timestamp for the slot end (UTC). */
  endsAt: string;
  /** Duration in minutes (mirrors clinic config). */
  durationMinutes: number;
};

export type AvailabilityResult = {
  date: string;
  timezone: string;
  slotMinutes: number;
  slots: AvailableSlot[];
};

function hoursForDay(
  hours: Clinic["hours"],
  day: DayOfWeek,
): ClinicHoursDay | null {
  if (!hours) return null;
  const found = hours.find((h) => h.day === day);
  if (!found || found.closed || !found.open || !found.close) return null;
  return found;
}

export async function getAvailability(
  clinic: Pick<Clinic, "id" | "hours" | "bookingConfig">,
  dateKey: string,
  now: Date = new Date(),
): Promise<AvailabilityResult> {
  const config = resolveBookingConfig(clinic);
  const empty: AvailabilityResult = {
    date: dateKey,
    timezone: config.timezone,
    slotMinutes: config.slotMinutes,
    slots: [],
  };
  if (!config.enabled) return empty;

  const parsed = parseDateKey(dateKey);
  if (!parsed) return empty;

  // Determine the day-of-week in clinic timezone for the queried date.
  // Anchor at noon to avoid DST edge ambiguity.
  const noonUtc = zonedTimeToUtc(
    parsed.year,
    parsed.month,
    parsed.day,
    12,
    0,
    config.timezone,
  );
  const dowIndex = dayOfWeekInZone(noonUtc, config.timezone);
  const dayKey = DAY_INDEX_TO_KEY[dowIndex];
  const dayHours = hoursForDay(clinic.hours, dayKey);
  if (!dayHours) return empty;

  const open = parseTimeOfDay(dayHours.open!);
  const close = parseTimeOfDay(dayHours.close!);
  if (!open || !close) return empty;

  const openUtc = zonedTimeToUtc(
    parsed.year,
    parsed.month,
    parsed.day,
    open.hour,
    open.minute,
    config.timezone,
  );
  const closeUtc = zonedTimeToUtc(
    parsed.year,
    parsed.month,
    parsed.day,
    close.hour,
    close.minute,
    config.timezone,
  );
  if (closeUtc.getTime() <= openUtc.getTime()) return empty;

  const slotMs = config.slotMinutes * 60_000;
  const bufferMs = config.bufferMinutes * 60_000;
  const stride = slotMs + bufferMs;
  const leadCutoff = new Date(now.getTime() + config.leadTimeHours * 3_600_000);
  const maxAhead = new Date(now.getTime() + config.maxDaysAhead * 86_400_000);

  // Past the maxDaysAhead horizon → no slots.
  if (openUtc.getTime() > maxAhead.getTime()) return empty;

  const candidates: AvailableSlot[] = [];
  for (
    let cursor = openUtc.getTime();
    cursor + slotMs <= closeUtc.getTime();
    cursor += stride
  ) {
    const startsAt = new Date(cursor);
    const endsAt = new Date(cursor + slotMs);
    if (startsAt.getTime() < leadCutoff.getTime()) continue;
    if (startsAt.getTime() > maxAhead.getTime()) break;
    candidates.push({
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      durationMinutes: config.slotMinutes,
    });
  }

  if (candidates.length === 0) return empty;

  // Subtract booked slots in this clinic on the same day window.
  const db = getDb();
  const dayStart = openUtc;
  const dayEnd = closeUtc;
  const booked = await db
    .select({
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinic.id),
        ne(appointments.status, "cancelled"),
        gte(appointments.startsAt, dayStart),
        lt(appointments.startsAt, dayEnd),
      ),
    );

  const bookedStarts = new Set(
    booked.map((b) => new Date(b.startsAt).getTime()),
  );

  const slots = candidates.filter((slot) => {
    const startMs = new Date(slot.startsAt).getTime();
    return !bookedStarts.has(startMs);
  });

  return {
    date: dateKey,
    timezone: config.timezone,
    slotMinutes: config.slotMinutes,
    slots,
  };
}
