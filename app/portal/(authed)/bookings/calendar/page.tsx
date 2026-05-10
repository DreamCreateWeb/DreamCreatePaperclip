import type { Route } from "next";
import Link from "next/link";

import { resolveBookingConfig } from "@/src/lib/booking/booking-config";
import { listAppointmentsForClinic } from "@/src/lib/booking/booking-service";
import {
  dateKeyInZone,
  formatInZone,
  zonedTimeToUtc,
} from "@/src/lib/booking/timezone";
import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";
import type { Appointment } from "@/src/db/schema";

export const dynamic = "force-dynamic";

const STATUS_TONES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-900 border-emerald-200",
  cancelled: "bg-stone-100 text-stone-600 border-stone-200 line-through",
  completed: "bg-sky-100 text-sky-900 border-sky-200",
  no_show: "bg-rose-100 text-rose-900 border-rose-200",
};

type WeekParam = { week?: string };

function startOfWeekKey(timezone: string, offsetWeeks: number): string {
  const today = new Date();
  const todayKey = dateKeyInZone(today, timezone);
  const [y, m, d] = todayKey.split("-").map(Number);
  // Monday-based week: compute day-of-week (0=Sun) at noon in zone.
  const noon = zonedTimeToUtc(y, m, d, 12, 0, timezone);
  const dow = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(noon);
  const dayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offsetFromMonday = dayMap[dow] ?? 0;
  // Move back to Monday and apply week offset
  const startUtc = new Date(noon.getTime());
  startUtc.setUTCDate(startUtc.getUTCDate() - offsetFromMonday + offsetWeeks * 7);
  return dateKeyInZone(startUtc, timezone);
}

function addDaysKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export default async function OwnerBookingsCalendarPage({
  searchParams,
}: {
  searchParams: Promise<WeekParam>;
}) {
  const owner = await getCurrentClinicOwner();
  if (!owner) return null;

  const params = await searchParams;
  const offset = Number.isFinite(Number(params.week)) ? Number(params.week) : 0;
  const config = resolveBookingConfig(owner.clinic);
  const tz = config.timezone;

  const startKey = startOfWeekKey(tz, offset);
  const endKey = addDaysKey(startKey, 7);
  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  const fromUtc = zonedTimeToUtc(sy, sm, sd, 0, 0, tz);
  const toUtc = zonedTimeToUtc(ey, em, ed, 0, 0, tz);

  const appointments = await listAppointmentsForClinic(owner.clinic.id, {
    from: fromUtc,
    to: toUtc,
    limit: 500,
  });

  const dayKeys = Array.from({ length: 7 }, (_, i) => addDaysKey(startKey, i));
  const byDay = new Map<string, Appointment[]>();
  for (const key of dayKeys) byDay.set(key, []);
  for (const a of appointments) {
    const key = dateKeyInZone(new Date(a.startsAt), tz);
    if (byDay.has(key)) byDay.get(key)!.push(a);
  }

  const rangeLabel = (() => {
    const start = zonedTimeToUtc(sy, sm, sd, 12, 0, tz);
    const last = zonedTimeToUtc(...(addDaysKey(startKey, 6).split("-").map(Number) as [number, number, number]), 12, 0, tz);
    const startStr = formatInZone(start, tz, { month: "short", day: "numeric" });
    const endStr = formatInZone(last, tz, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} – ${endStr}`;
  })();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Bookings
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] text-ink">
            Week of {rangeLabel}
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            Times shown in {tz}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/portal/bookings/calendar?week=${offset - 1}` as Route}
            className="rounded-pill border border-rule px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted hover:border-ink hover:text-ink"
          >
            ← Prev
          </Link>
          <Link
            href={"/portal/bookings/calendar" as Route}
            className="rounded-pill border border-rule px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted hover:border-ink hover:text-ink"
          >
            This week
          </Link>
          <Link
            href={`/portal/bookings/calendar?week=${offset + 1}` as Route}
            className="rounded-pill border border-rule px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted hover:border-ink hover:text-ink"
          >
            Next →
          </Link>
          <Link
            href={"/portal/bookings" as Route}
            className="ml-3 text-xs font-medium uppercase tracking-[0.16em] text-accent underline-offset-4 hover:underline"
          >
            List view →
          </Link>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-7">
        {dayKeys.map((key) => {
          const [y, m, d] = key.split("-").map(Number);
          const noon = zonedTimeToUtc(y, m, d, 12, 0, tz);
          const heading = formatInZone(noon, tz, {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          const items = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              className="rounded-card border border-rule bg-white p-3"
            >
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
                {heading}
              </p>
              <div className="mt-3 space-y-2">
                {items.length === 0 ? (
                  <p className="text-xs text-ink-muted">—</p>
                ) : (
                  items.map((a) => {
                    const tone = STATUS_TONES[a.status] ?? "bg-stone-100 text-stone-700 border-stone-200";
                    return (
                      <div
                        key={a.id}
                        className={`rounded-md border px-2 py-1.5 text-xs ${tone}`}
                      >
                        <p className="font-medium">
                          {formatInZone(new Date(a.startsAt), tz, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          {a.patientName}
                        </p>
                        <p className="opacity-80">{a.serviceName}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
