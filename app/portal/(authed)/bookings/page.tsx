import type { Route } from "next";
import Link from "next/link";

import { resolveBookingConfig } from "@/src/lib/booking/booking-config";
import { listAppointmentsForClinic } from "@/src/lib/booking/booking-service";
import {
  formatBookingClock,
  formatBookingDate,
} from "@/src/lib/booking/format";
import { telHref } from "@/src/lib/clinic/format";
import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";

import { BookingRowActions } from "./booking-row-actions";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const STATUS_TONES: Record<string, { label: string; tone: string }> = {
  pending: { label: "Pending", tone: "bg-amber-100 text-amber-900" },
  confirmed: { label: "Confirmed", tone: "bg-emerald-100 text-emerald-900" },
  cancelled: { label: "Cancelled", tone: "bg-stone-200 text-stone-800" },
  completed: { label: "Completed", tone: "bg-sky-100 text-sky-900" },
  no_show: { label: "No-show", tone: "bg-rose-100 text-rose-900" },
};

export default async function OwnerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const owner = await getCurrentClinicOwner();
  if (!owner) return null;

  const params = await searchParams;
  const rawFilter = (params.filter ?? "upcoming") as FilterKey;
  const filter: FilterKey = FILTERS.some((f) => f.key === rawFilter)
    ? rawFilter
    : "upcoming";

  const now = new Date();
  const options =
    filter === "upcoming"
      ? { from: now, limit: 200 }
      : filter === "past"
        ? { to: now, limit: 200 }
        : { limit: 200 };

  const appointments = await listAppointmentsForClinic(owner.clinic.id, options);
  const ordered = filter === "past" ? [...appointments].reverse() : appointments;
  const config = resolveBookingConfig(owner.clinic);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Bookings
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] text-ink">
            Patient appointments
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            Confirm, reschedule, or cancel appointments. Patients receive an
            email when you change a confirmed or cancelled status.
          </p>
        </div>
        <Link
          href={"/portal/bookings/calendar" as Route}
          className="text-xs font-medium uppercase tracking-[0.16em] text-accent underline-offset-4 hover:underline"
        >
          Calendar view →
        </Link>
      </header>

      <nav
        aria-label="Filter bookings"
        className="flex flex-wrap items-center gap-1 border-b border-rule"
      >
        {FILTERS.map((f) => {
          const active = f.key === filter;
          const href = (
            f.key === "upcoming" ? "/portal/bookings" : `/portal/bookings?filter=${f.key}`
          ) as Route;
          return (
            <Link
              key={f.key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "border-b-2 px-4 py-2 text-sm transition " +
                (active
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-muted hover:border-rule hover:text-ink")
              }
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {ordered.length === 0 ? (
        <div className="rounded-card border border-rule bg-white p-10 text-center">
          <p className="text-sm font-medium text-ink">
            {filter === "upcoming"
              ? "No upcoming appointments"
              : filter === "past"
                ? "No past appointments"
                : "No appointments yet"}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            When patients book through your site, they&rsquo;ll appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {ordered.map((a) => {
            const tone = STATUS_TONES[a.status] ?? {
              label: a.status,
              tone: "bg-stone-200 text-stone-800",
            };
            const phone = telHref(a.patientPhone);
            return (
              <li
                key={a.id}
                className="rounded-card border border-rule bg-white p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {a.patientName}
                      <span
                        className={`ml-3 inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${tone.tone}`}
                      >
                        {tone.label}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      <a className="hover:underline" href={`mailto:${a.patientEmail}`}>
                        {a.patientEmail}
                      </a>
                      {phone ? (
                        <>
                          {" · "}
                          <a className="hover:underline" href={phone}>
                            {a.patientPhone}
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-ink">
                      {formatBookingDate(a, owner.clinic)}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {formatBookingClock(a, owner.clinic)} · {config.timezone}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-ink">
                  <span className="text-ink-muted">Service:</span> {a.serviceName}
                </p>
                {a.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">
                    “{a.notes}”
                  </p>
                ) : null}
                <div className="mt-4 border-t border-rule pt-3">
                  <BookingRowActions appointmentId={a.id} status={a.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
