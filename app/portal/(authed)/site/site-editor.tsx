"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { Clinic, ClinicHoursDay, DayOfWeek } from "@/src/db/schema";

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const DAY_ORDER: DayOfWeek[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

type FormState = {
  name: string;
  contactPhone: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
  };
  hours: Array<ClinicHoursDay & { open: string; close: string }>;
  social: {
    website: string;
    facebook: string;
    instagram: string;
    google: string;
  };
};

function buildInitialHours(
  hours: Clinic["hours"],
): FormState["hours"] {
  const byDay = new Map<DayOfWeek, ClinicHoursDay>();
  for (const h of hours ?? []) byDay.set(h.day, h);
  return DAY_ORDER.map((day) => {
    const h = byDay.get(day);
    return {
      day,
      closed: h?.closed ?? true,
      open: h?.open ?? "08:00",
      close: h?.close ?? "17:00",
    };
  });
}

function buildInitialState(clinic: Clinic): FormState {
  return {
    name: clinic.name,
    contactPhone: clinic.contactPhone ?? "",
    address: {
      line1: clinic.address?.line1 ?? "",
      line2: clinic.address?.line2 ?? "",
      city: clinic.address?.city ?? "",
      state: clinic.address?.state ?? "AR",
      postalCode: clinic.address?.postalCode ?? "",
    },
    hours: buildInitialHours(clinic.hours),
    social: {
      website: clinic.social?.website ?? "",
      facebook: clinic.social?.facebook ?? "",
      instagram: clinic.social?.instagram ?? "",
      google: clinic.social?.google ?? "",
    },
  };
}

const fieldClass =
  "w-full rounded-card border border-rule bg-white px-4 py-3 text-base text-ink shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";
const labelClass =
  "text-xs font-medium uppercase tracking-[0.16em] text-ink-muted";

export function SiteEditor({ clinic }: { clinic: Clinic }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => buildInitialState(clinic));
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function getError(path: string): string | undefined {
    return errors[path]?.[0];
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const payload = {
      name: form.name.trim(),
      contactPhone: form.contactPhone.trim(),
      address: {
        line1: form.address.line1.trim(),
        line2: form.address.line2.trim() || undefined,
        city: form.address.city.trim(),
        state: form.address.state.trim().toUpperCase(),
        postalCode: form.address.postalCode.trim(),
      },
      hours: form.hours.map((h) =>
        h.closed
          ? { day: h.day, closed: true }
          : { day: h.day, closed: false, open: h.open, close: h.close },
      ),
      social: {
        website: form.social.website.trim() || undefined,
        facebook: form.social.facebook.trim() || undefined,
        instagram: form.social.instagram.trim() || undefined,
        google: form.social.google.trim() || undefined,
      },
    };

    try {
      const res = await fetch("/api/owner/clinic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        fieldErrors?: Record<string, string[]>;
        error?: string;
      };

      if (res.ok && body.ok) {
        setSavedAt(new Date());
        router.refresh();
      } else if (res.status === 422 && body.fieldErrors) {
        setErrors(body.fieldErrors);
      } else {
        setErrors({ _: ["Something went wrong. Please try again."] });
      }
    } catch {
      setErrors({ _: ["Network error. Please try again."] });
    } finally {
      setSubmitting(false);
    }
  }

  const generalError = errors._?.[0];

  return (
    <form className="space-y-12" onSubmit={onSubmit} noValidate>
      <Section
        title="Clinic basics"
        description="Your name and primary contact phone, used in the header and footer of your site."
      >
        <Field label="Clinic name" error={getError("name")}>
          <input
            className={fieldClass}
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            required
            maxLength={120}
          />
        </Field>
        <Field label="Contact phone" error={getError("contactPhone")}>
          <input
            className={fieldClass}
            value={form.contactPhone}
            onChange={(e) => onChange("contactPhone", e.target.value)}
            inputMode="tel"
            placeholder="(479) 555-0142"
            required
          />
        </Field>
      </Section>

      <Section
        title="Address"
        description="Used for the location card, contact page, and structured data for search engines."
      >
        <Field label="Street address" error={getError("address.line1")}>
          <input
            className={fieldClass}
            value={form.address.line1}
            onChange={(e) =>
              onChange("address", { ...form.address, line1: e.target.value })
            }
            required
            maxLength={200}
          />
        </Field>
        <Field label="Suite / unit (optional)" error={getError("address.line2")}>
          <input
            className={fieldClass}
            value={form.address.line2}
            onChange={(e) =>
              onChange("address", { ...form.address, line2: e.target.value })
            }
            maxLength={200}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" error={getError("address.city")}>
            <input
              className={fieldClass}
              value={form.address.city}
              onChange={(e) =>
                onChange("address", { ...form.address, city: e.target.value })
              }
              required
            />
          </Field>
          <Field label="State" error={getError("address.state")}>
            <input
              className={fieldClass}
              value={form.address.state}
              onChange={(e) =>
                onChange("address", {
                  ...form.address,
                  state: e.target.value.toUpperCase(),
                })
              }
              maxLength={2}
              required
            />
          </Field>
          <Field label="ZIP" error={getError("address.postalCode")}>
            <input
              className={fieldClass}
              value={form.address.postalCode}
              onChange={(e) =>
                onChange("address", {
                  ...form.address,
                  postalCode: e.target.value,
                })
              }
              required
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Hours"
        description="Mark a day closed if you don't see patients that day."
      >
        <div className="space-y-3">
          {form.hours.map((h, i) => {
            const dayError =
              getError(`hours.${i}`) ||
              getError(`hours.${i}.open`) ||
              getError(`hours.${i}.close`);
            return (
              <div
                key={h.day}
                className="grid items-center gap-3 sm:grid-cols-[120px_120px_1fr_1fr]"
              >
                <span className="text-sm font-medium text-ink">
                  {DAY_LABELS[h.day]}
                </span>
                <label className="inline-flex items-center gap-2 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={h.closed}
                    onChange={(e) => {
                      const next = [...form.hours];
                      next[i] = { ...next[i], closed: e.target.checked };
                      onChange("hours", next);
                    }}
                  />
                  Closed
                </label>
                <input
                  type="time"
                  className={fieldClass}
                  value={h.open}
                  disabled={h.closed}
                  onChange={(e) => {
                    const next = [...form.hours];
                    next[i] = { ...next[i], open: e.target.value };
                    onChange("hours", next);
                  }}
                />
                <input
                  type="time"
                  className={fieldClass}
                  value={h.close}
                  disabled={h.closed}
                  onChange={(e) => {
                    const next = [...form.hours];
                    next[i] = { ...next[i], close: e.target.value };
                    onChange("hours", next);
                  }}
                />
                {dayError ? (
                  <p className="text-xs text-red-600 sm:col-span-4">
                    {dayError}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Social & web"
        description="Optional. Shown in the footer and used in your site's structured data."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Website" error={getError("social.website")}>
            <input
              className={fieldClass}
              value={form.social.website}
              onChange={(e) =>
                onChange("social", { ...form.social, website: e.target.value })
              }
              type="url"
              placeholder="https://"
            />
          </Field>
          <Field label="Google profile" error={getError("social.google")}>
            <input
              className={fieldClass}
              value={form.social.google}
              onChange={(e) =>
                onChange("social", { ...form.social, google: e.target.value })
              }
              type="url"
              placeholder="https://maps.google.com/..."
            />
          </Field>
          <Field label="Facebook" error={getError("social.facebook")}>
            <input
              className={fieldClass}
              value={form.social.facebook}
              onChange={(e) =>
                onChange("social", { ...form.social, facebook: e.target.value })
              }
              type="url"
              placeholder="https://www.facebook.com/..."
            />
          </Field>
          <Field label="Instagram" error={getError("social.instagram")}>
            <input
              className={fieldClass}
              value={form.social.instagram}
              onChange={(e) =>
                onChange("social", {
                  ...form.social,
                  instagram: e.target.value,
                })
              }
              type="url"
              placeholder="https://www.instagram.com/..."
            />
          </Field>
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-between gap-4 border-t border-rule bg-white px-6 py-4">
        <div className="text-sm">
          {generalError ? (
            <span className="text-red-600">{generalError}</span>
          ) : savedAt ? (
            <span className="text-ink-muted">
              Saved at {savedAt.toLocaleTimeString()}.
            </span>
          ) : (
            <span className="text-ink-muted">
              Changes go live on your public site immediately after saving.
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-pill bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-ink disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 md:grid-cols-[260px_1fr]">
      <header>
        <h2 className="font-display text-xl text-ink">{title}</h2>
        <p className="mt-2 text-sm text-ink-muted">{description}</p>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
