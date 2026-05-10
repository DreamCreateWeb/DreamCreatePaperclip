/**
 * Helpers for converting between clinic-local wall-clock times and absolute
 * UTC instants. We intentionally avoid bringing in date-fns-tz so that the
 * patient site stays dependency-light. Browsers and Node 20+ both support
 * `Intl.DateTimeFormat` with arbitrary IANA `timeZone` values, which is all
 * we need.
 */

function timezoneOffsetMs(timezone: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : 0;
  };
  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = get("hour");
  const minute = get("minute");
  const second = get("second");
  // Intl returns "24" instead of "00" at midnight on some platforms.
  if (hour === 24) hour = 0;
  const wallUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return wallUtc - instant.getTime();
}

/**
 * Convert a wall-clock date in `timezone` (year/month/day/hour/minute) to a
 * UTC `Date`. Handles DST transitions by reapplying the offset for the candidate.
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  const candidateUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  const offsetA = timezoneOffsetMs(timezone, new Date(candidateUtcMs));
  const firstGuess = candidateUtcMs - offsetA;
  const offsetB = timezoneOffsetMs(timezone, new Date(firstGuess));
  return new Date(candidateUtcMs - offsetB);
}

/**
 * Returns the YYYY-MM-DD calendar date for `instant` as observed in `timezone`.
 */
export function dateKeyInZone(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/**
 * Returns a 0-indexed day of week (0 = Sunday) for the given instant in
 * `timezone`, matching JavaScript's `Date#getDay`.
 */
export function dayOfWeekInZone(instant: Date, timezone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(instant);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

export function parseDateKey(dateKey: string):
  | { year: number; month: number; day: number }
  | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return { year, month, day };
}

export function parseTimeOfDay(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function formatInZone(
  instant: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone, ...options }).format(
    instant,
  );
}
