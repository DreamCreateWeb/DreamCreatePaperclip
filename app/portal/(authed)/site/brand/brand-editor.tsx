"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { ClinicBrand } from "@/src/db/schema";
import { brandStyle, resolveBrand } from "@/src/lib/clinic/brand";

const fieldClass =
  "w-full rounded-card border border-rule bg-white px-4 py-3 text-base text-ink shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";
const labelClass =
  "text-xs font-medium uppercase tracking-[0.16em] text-ink-muted";

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

type FormState = {
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
};

function buildInitialState(brand: ClinicBrand | null | undefined): FormState {
  return {
    primaryColor: brand?.primaryColor ?? "#0a3d2e",
    accentColor: brand?.accentColor ?? "#d8ebe2",
    logoUrl: brand?.logoUrl ?? "",
  };
}

export function BrandEditor({
  clinicName,
  initial,
}: {
  clinicName: string;
  initial: ClinicBrand | null | undefined;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => buildInitialState(initial));
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const previewBrand = useMemo(
    () =>
      resolveBrand({
        primaryColor: form.primaryColor,
        accentColor: form.accentColor,
        logoUrl: form.logoUrl || undefined,
      }),
    [form.primaryColor, form.accentColor, form.logoUrl],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
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
      brand: {
        primaryColor: form.primaryColor.trim().toLowerCase(),
        accentColor: form.accentColor.trim().toLowerCase(),
        logoUrl: form.logoUrl.trim() || undefined,
      },
    };

    try {
      const res = await fetch("/api/owner/clinic/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        fieldErrors?: Record<string, string[]>;
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
    <form className="space-y-10" onSubmit={onSubmit} noValidate>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <ColorField
            label="Primary color"
            hint="Used for headers, primary buttons, and links."
            value={form.primaryColor}
            onChange={(v) => update("primaryColor", v)}
            error={getError("brand.primaryColor")}
          />
          <ColorField
            label="Accent color"
            hint="Used for highlights and section backgrounds."
            value={form.accentColor}
            onChange={(v) => update("accentColor", v)}
            error={getError("brand.accentColor")}
          />
          <label className="block">
            <span className={labelClass}>Logo URL (optional)</span>
            <input
              className={`mt-2 ${fieldClass}`}
              type="url"
              placeholder="https://"
              value={form.logoUrl}
              onChange={(e) => update("logoUrl", e.target.value)}
              maxLength={500}
            />
            <p className="mt-1 text-xs text-ink-muted">
              Hosted SVG or PNG. We&rsquo;ll show your clinic name if no logo
              is provided.
            </p>
            {getError("brand.logoUrl") ? (
              <p className="mt-1 text-xs text-red-600">
                {getError("brand.logoUrl")}
              </p>
            ) : null}
          </label>
        </div>

        <BrandPreview
          clinicName={clinicName}
          primary={previewBrand.primary}
          primaryFg={previewBrand.primaryFg}
          accent={previewBrand.accent}
          accentFg={previewBrand.accentFg}
          primarySoft={previewBrand.primarySoft}
          logoUrl={form.logoUrl.trim() || undefined}
          style={brandStyle(previewBrand)}
        />
      </div>

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
              Preview updates live; save to publish.
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

function ColorField({
  label,
  hint,
  value,
  onChange,
  error,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const safeForPicker = HEX_PATTERN.test(value) ? value : "#000000";
  return (
    <div className="space-y-2">
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={safeForPicker}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-12 w-12 cursor-pointer rounded-card border border-rule bg-transparent"
        />
        <input
          className={fieldClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          placeholder="#0a3d2e"
        />
      </div>
      <p className="text-xs text-ink-muted">{hint}</p>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function BrandPreview({
  clinicName,
  primary,
  primaryFg,
  accent,
  accentFg,
  primarySoft,
  logoUrl,
  style,
}: {
  clinicName: string;
  primary: string;
  primaryFg: string;
  accent: string;
  accentFg: string;
  primarySoft: string;
  logoUrl?: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      className="overflow-hidden rounded-card border border-rule bg-white shadow-sm"
      style={style}
    >
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ backgroundColor: primary, color: primaryFg }}
      >
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={clinicName}
              className="h-8 w-auto"
            />
          ) : (
            <span className="text-sm font-medium tracking-[0.08em]">
              {clinicName}
            </span>
          )}
        </div>
        <button
          type="button"
          className="rounded-pill px-4 py-1 text-xs font-medium uppercase tracking-[0.16em]"
          style={{ backgroundColor: accent, color: accentFg }}
        >
          Book a visit
        </button>
      </div>
      <div className="space-y-4 px-6 py-8" style={{ backgroundColor: "#fff" }}>
        <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: primary }}>
          Welcome
        </p>
        <h3 className="font-display text-3xl leading-[1.1] text-ink">
          A picky-proof preview
        </h3>
        <p className="text-sm text-ink-muted">
          This is roughly how your homepage hero, primary button, and accent
          chips will read on your live site.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="rounded-pill px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: primarySoft, color: primary }}
          >
            New patients welcome
          </span>
          <span
            className="rounded-pill px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: accent, color: accentFg }}
          >
            Same-day appointments
          </span>
        </div>
        <button
          type="button"
          className="rounded-pill px-5 py-2 text-sm font-medium"
          style={{ backgroundColor: primary, color: primaryFg }}
        >
          Schedule online →
        </button>
      </div>
    </div>
  );
}
