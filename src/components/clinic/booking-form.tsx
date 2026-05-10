"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  Clinic,
  ClinicBookingConfig,
  ClinicService,
} from "@/src/db/schema";

type Slot = {
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
};

type AvailabilityResponse = {
  ok: boolean;
  date?: string;
  timezone?: string;
  slotMinutes?: number;
  slots?: Slot[];
  error?: string;
};

type Confirmed = {
  id: string;
  startsAt: string;
  endsAt: string;
  serviceName: string;
};

type Props = {
  clinic: Pick<Clinic, "slug" | "services">;
  config: ClinicBookingConfig;
};

type FormErrors = Partial<
  Record<"service" | "date" | "slot" | "name" | "email" | "phone" | "notes" | "form", string>
>;

function todayKeyInZone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatSlotLabel(startsAt: string, timezone: string): string {
  const dt = new Date(startsAt);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(dt);
}

function formatLongDate(startsAt: string, timezone: string): string {
  const dt = new Date(startsAt);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dt);
}

export function BookingForm({ clinic, config }: Props) {
  const services = clinic.services as ClinicService[];
  const earliest = useMemo(() => {
    const today = todayKeyInZone(config.timezone);
    const min = Math.ceil(config.leadTimeHours / 24);
    return addDays(today, min);
  }, [config.timezone, config.leadTimeHours]);
  const latest = useMemo(
    () => addDays(todayKeyInZone(config.timezone), config.maxDaysAhead),
    [config.timezone, config.maxDaysAhead],
  );

  const [serviceName, setServiceName] = useState<string>(
    services[0]?.name ?? "",
  );
  const [date, setDate] = useState<string>(earliest);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoadingSlots(true);
    setSlot(null);
    setSlots(null);
    fetch(`/api/clinic/${clinic.slug}/availability?date=${encodeURIComponent(date)}`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as AvailabilityResponse;
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setSlots([]);
          return;
        }
        setSlots(json.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, clinic.slug]);

  if (confirmed) {
    return (
      <div
        role="status"
        className="rounded-card border border-rule bg-white p-8"
      >
        <p
          className="text-xs font-medium uppercase tracking-[0.22em]"
          style={{ color: "var(--clinic-primary)" }}
        >
          Request received
        </p>
        <h2 className="mt-3 font-display text-2xl text-ink">
          You&rsquo;re on the schedule.
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          We sent a confirmation to <strong>{email}</strong>. We&rsquo;ll reach
          out shortly to lock it in.
        </p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
              Service
            </dt>
            <dd className="mt-1 text-ink">{confirmed.serviceName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
              When
            </dt>
            <dd className="mt-1 text-ink">
              {formatLongDate(confirmed.startsAt, config.timezone)}
              <br />
              {formatSlotLabel(confirmed.startsAt, config.timezone)} –{" "}
              {formatSlotLabel(confirmed.endsAt, config.timezone)}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="rounded-card border border-rule bg-white p-8">
        <p className="text-sm text-ink-muted">
          We&rsquo;re still finalizing our list of services. Please call or use
          the contact form to request an appointment.
        </p>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    if (!slot) {
      setErrors({ slot: "Pick a time that works." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clinic/${clinic.slug}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName,
          startsAt: slot.startsAt,
          patientName: name,
          patientEmail: email,
          patientPhone: phone,
          notes,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        appointment?: Confirmed;
        fieldErrors?: Record<string, string[]>;
      };
      if (!res.ok || !json.ok) {
        if (json.error === "slot_unavailable") {
          setErrors({
            form: "That time was just booked. Please pick another.",
          });
          // Re-fetch availability so the user sees fresh slots.
          setSlot(null);
          setSlots(null);
          fetch(
            `/api/clinic/${clinic.slug}/availability?date=${encodeURIComponent(date)}`,
          )
            .then(async (r) => {
              const j = (await r.json().catch(() => ({}))) as AvailabilityResponse;
              setSlots(j.slots ?? []);
            })
            .catch(() => setSlots([]));
        } else if (json.fieldErrors) {
          const next: FormErrors = {};
          for (const [k, msgs] of Object.entries(json.fieldErrors)) {
            const msg = msgs?.[0];
            if (!msg) continue;
            if (k === "patientName") next.name = msg;
            else if (k === "patientEmail") next.email = msg;
            else if (k === "patientPhone") next.phone = msg;
            else if (k === "notes") next.notes = msg;
            else if (k === "serviceName") next.service = msg;
            else if (k === "startsAt") next.slot = msg;
          }
          setErrors(next);
        } else {
          setErrors({
            form:
              json.message ?? "We couldn't book that time. Please try again.",
          });
        }
        return;
      }
      if (json.appointment) {
        setConfirmed({
          id: json.appointment.id,
          startsAt: json.appointment.startsAt,
          endsAt: json.appointment.endsAt,
          serviceName: json.appointment.serviceName,
        });
      }
    } catch {
      setErrors({ form: "Network error — please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-8 rounded-card border border-rule bg-white p-6 sm:p-8"
    >
      <section className="space-y-4">
        <SectionHeading step={1} title="Pick a service" />
        <div className="grid gap-2">
          {services.map((s) => {
            const active = s.name === serviceName;
            return (
              <label
                key={s.name}
                className={`flex cursor-pointer items-start gap-3 rounded-card border p-4 transition ${
                  active
                    ? "border-ink bg-canvas"
                    : "border-rule hover:border-ink-muted"
                }`}
              >
                <input
                  type="radio"
                  name="service"
                  value={s.name}
                  checked={active}
                  onChange={() => setServiceName(s.name)}
                  className="mt-1 accent-ink"
                />
                <div>
                  <p className="text-sm font-medium text-ink">{s.name}</p>
                  {s.description ? (
                    <p className="mt-1 text-sm text-ink-muted">
                      {s.description}
                    </p>
                  ) : null}
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading step={2} title="Choose a date and time" />
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div>
            <label
              htmlFor="booking-date"
              className="block text-sm font-medium text-ink"
            >
              Date
            </label>
            <input
              id="booking-date"
              type="date"
              value={date}
              min={earliest}
              max={latest}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-rule bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
            <p className="mt-2 text-xs text-ink-muted">
              {config.leadTimeHours >= 24
                ? `Earliest opening: ${Math.round(config.leadTimeHours / 24)} day${
                    config.leadTimeHours >= 48 ? "s" : ""
                  } out.`
                : `Earliest opening: ${config.leadTimeHours} hour${
                    config.leadTimeHours === 1 ? "" : "s"
                  } out.`}
            </p>
          </div>
          <div>
            <label
              className="block text-sm font-medium text-ink"
              htmlFor="booking-time-grid"
            >
              Time ({config.slotMinutes}-min slots)
            </label>
            <div
              id="booking-time-grid"
              className="mt-1.5 flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Available times"
            >
              {loadingSlots ? (
                <p className="text-sm text-ink-muted">Loading times…</p>
              ) : !slots || slots.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No openings on that day. Try another date.
                </p>
              ) : (
                slots.map((s) => {
                  const active = slot?.startsAt === s.startsAt;
                  return (
                    <button
                      type="button"
                      key={s.startsAt}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSlot(s)}
                      className={`rounded-pill border px-4 py-2 text-sm transition ${
                        active
                          ? "border-ink bg-ink text-white"
                          : "border-rule text-ink hover:border-ink-muted"
                      }`}
                    >
                      {formatSlotLabel(s.startsAt, config.timezone)}
                    </button>
                  );
                })
              )}
            </div>
            {errors.slot ? (
              <p className="mt-1 text-xs text-red-700">{errors.slot}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading step={3} title="Your details" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="booking-name" label="Your name" error={errors.name}>
            <input
              id="booking-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </Field>
          <Field id="booking-email" label="Email" error={errors.email}>
            <input
              id="booking-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </Field>
          <Field id="booking-phone" label="Phone (optional)" error={errors.phone}>
            <input
              id="booking-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
            />
          </Field>
          <Field
            id="booking-notes"
            label="Anything we should know? (optional)"
            error={errors.notes}
            className="sm:col-span-2"
          >
            <textarea
              id="booking-notes"
              name="notes"
              maxLength={2000}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input resize-y"
            />
          </Field>
          <div className="hidden">
            <label htmlFor="booking-nickname">Nickname</label>
            <input
              id="booking-nickname"
              name="nickname"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
        <p className="text-xs text-ink-muted">
          By booking, you agree we may contact you to confirm. We never share
          your details.
        </p>
        <button
          type="submit"
          disabled={submitting || !slot}
          className="inline-flex h-11 items-center rounded-pill px-6 text-sm font-medium shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            background: "var(--clinic-primary)",
            color: "var(--clinic-primary-fg)",
          }}
        >
          {submitting ? "Booking…" : "Request appointment"}
        </button>
      </div>

      {errors.form ? (
        <p
          role="alert"
          className="rounded-card border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {errors.form}
        </p>
      ) : null}

      <style>{`
        .input {
          width: 100%;
          border: 1px solid var(--color-rule);
          background: #fff;
          color: var(--color-ink);
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font: inherit;
          line-height: 1.4;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        .input:focus {
          outline: none;
          border-color: var(--clinic-primary);
          box-shadow: 0 0 0 3px var(--clinic-primary-soft);
        }
      `}</style>
    </form>
  );
}

function SectionHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
        style={{
          background: "var(--clinic-primary-soft)",
          color: "var(--clinic-primary)",
        }}
      >
        {step}
      </span>
      <h2 className="font-display text-xl text-ink">{title}</h2>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1 text-xs text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
