"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import {
  DAYS_OF_WEEK,
  SERVICE_CATALOG,
  type DayOfWeek,
  type OnboardingInput,
} from "@/src/lib/onboarding/schema";

type FieldErrors = Record<string, string[]>;

type ServiceRow = { name: string; description: string };
type TeamRow = { name: string; role: string; bio: string; photoUrl: string };
type HoursRow = {
  day: DayOfWeek;
  closed: boolean;
  open: string;
  close: string;
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const DEFAULT_HOURS: HoursRow[] = DAYS_OF_WEEK.map((day) => ({
  day,
  closed: day === "sat" || day === "sun",
  open: "08:00",
  close: "17:00",
}));

function fieldError(errors: FieldErrors, key: string): string | null {
  const found = errors[key];
  return found && found.length > 0 ? found[0] : null;
}

function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted"
      >
        {label}
        {optional ? (
          <span className="ml-2 text-ink-muted/60 normal-case tracking-normal">
            (optional)
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "rounded-card border border-rule bg-white px-4 py-3 text-base text-ink shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft placeholder:text-ink-muted/60";

const STORAGE_KEY = "onboard_form_state";
const TOTAL_STEPS = 3;

export function OnboardForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("AR");
  const [postalCode, setPostalCode] = useState("");

  const [template, setTemplate] = useState<"warm" | "modern">("warm");
  const [primaryColor, setPrimaryColor] = useState("#0a3d2e");
  const [accentColor, setAccentColor] = useState("#d8ebe2");
  const [logoUrl, setLogoUrl] = useState("");

  const [selectedCatalog, setSelectedCatalog] = useState<Set<string>>(
    () => new Set(["General dentistry"]),
  );
  const [extraServices, setExtraServices] = useState<ServiceRow[]>([]);

  const [team, setTeam] = useState<TeamRow[]>([
    { name: "", role: "", bio: "", photoUrl: "" },
  ]);

  const [hours, setHours] = useState<HoursRow[]>(DEFAULT_HOURS);

  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [google, setGoogle] = useState("");

  const [nickname, setNickname] = useState(""); // honeypot

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setName(state.name || "");
        setSlug(state.slug || "");
        setContactName(state.contactName || "");
        setContactEmail(state.contactEmail || "");
        setContactPhone(state.contactPhone || "");
        setLine1(state.line1 || "");
        setLine2(state.line2 || "");
        setCity(state.city || "");
        setStateCode(state.stateCode || "AR");
        setPostalCode(state.postalCode || "");
        setTemplate(state.template || "warm");
        setPrimaryColor(state.primaryColor || "#0a3d2e");
        setAccentColor(state.accentColor || "#d8ebe2");
        setLogoUrl(state.logoUrl || "");
        setSelectedCatalog(new Set(state.selectedCatalog || ["General dentistry"]));
        setExtraServices(state.extraServices || []);
        setTeam(state.team || [{ name: "", role: "", bio: "", photoUrl: "" }]);
        setHours(state.hours || DEFAULT_HOURS);
        setWebsite(state.website || "");
        setFacebook(state.facebook || "");
        setInstagram(state.instagram || "");
        setGoogle(state.google || "");
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Autosave to localStorage
  useEffect(() => {
    const state = {
      name,
      slug,
      contactName,
      contactEmail,
      contactPhone,
      line1,
      line2,
      city,
      stateCode,
      postalCode,
      template,
      primaryColor,
      accentColor,
      logoUrl,
      selectedCatalog: Array.from(selectedCatalog),
      extraServices,
      team,
      hours,
      website,
      facebook,
      instagram,
      google,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [
    name,
    slug,
    contactName,
    contactEmail,
    contactPhone,
    line1,
    line2,
    city,
    stateCode,
    postalCode,
    template,
    primaryColor,
    accentColor,
    logoUrl,
    selectedCatalog,
    extraServices,
    team,
    hours,
    website,
    facebook,
    instagram,
    google,
  ]);

  const slugPlaceholder = useMemo(() => {
    if (!name.trim()) return "auto-generated from clinic name";
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  }, [name]);

  function toggleCatalog(svc: string) {
    setSelectedCatalog((prev) => {
      const next = new Set(prev);
      if (next.has(svc)) next.delete(svc);
      else next.add(svc);
      return next;
    });
  }

  function addExtraService() {
    setExtraServices((prev) => [...prev, { name: "", description: "" }]);
  }

  function removeExtraService(idx: number) {
    setExtraServices((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateExtraService(idx: number, patch: Partial<ServiceRow>) {
    setExtraServices((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  }

  function addTeam() {
    setTeam((prev) => [...prev, { name: "", role: "", bio: "", photoUrl: "" }]);
  }

  function removeTeam(idx: number) {
    setTeam((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateTeam(idx: number, patch: Partial<TeamRow>) {
    setTeam((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  }

  function updateHours(day: DayOfWeek, patch: Partial<HoursRow>) {
    setHours((prev) =>
      prev.map((row) => (row.day === day ? { ...row, ...patch } : row)),
    );
  }

  function buildPayload(): OnboardingInput {
    const services: ServiceRow[] = [
      ...Array.from(selectedCatalog).map((s) => ({ name: s, description: "" })),
      ...extraServices.filter((s) => s.name.trim().length > 0),
    ];

    return {
      name: name.trim(),
      slug: slug.trim() || undefined,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      address: {
        line1: line1.trim(),
        line2: line2.trim() || undefined,
        city: city.trim(),
        state: stateCode.trim().toUpperCase(),
        postalCode: postalCode.trim(),
      },
      brand: {
        template,
        primaryColor: primaryColor.trim(),
        accentColor: accentColor.trim(),
        logoUrl: logoUrl.trim() || undefined,
      },
      services,
      team: team
        .filter((t) => t.name.trim() || t.role.trim())
        .map((t) => ({
          name: t.name.trim(),
          role: t.role.trim(),
          bio: t.bio.trim() || undefined,
          photoUrl: t.photoUrl.trim() || undefined,
        })),
      hours,
      social: {
        website: website.trim() || undefined,
        facebook: facebook.trim() || undefined,
        instagram: instagram.trim() || undefined,
        google: google.trim() || undefined,
      },
      nickname,
    };
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    // Move to next step if not on last step
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      return;
    }

    setTopError(null);
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (res.ok) {
        localStorage.removeItem(STORAGE_KEY);
        const json = (await res.json()) as { slug?: string; clinicId?: string };
        const targetSlug = json.slug ?? "queued";
        const params = new URLSearchParams({ slug: targetSlug });
        if (json.clinicId) params.set("clinicId", json.clinicId);
        const next = `/onboard/thanks?${params.toString()}` as Route;
        router.push(next);
        return;
      }

      if (res.status === 429) {
        setTopError(
          "We've received a lot of requests from your network. Please try again shortly.",
        );
        return;
      }

      if (res.status === 422) {
        const json = (await res.json()) as { fieldErrors?: FieldErrors };
        const fe = json.fieldErrors ?? {};
        setErrors(fe);
        setTopError("Please fix the highlighted fields below.");
        const firstKey = Object.keys(fe)[0];
        if (firstKey) {
          const el = document.querySelector(
            `[data-field="${CSS.escape(firstKey)}"]`,
          );
          if (el && "scrollIntoView" in el) {
            (el as HTMLElement).scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        }
        return;
      }

      setTopError(
        "Something went wrong saving your submission. Please try again.",
      );
    } catch {
      setTopError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-12">
      {/* Honeypot — visually hidden, autocomplete off */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-9999px] top-[-9999px] h-px w-px overflow-hidden opacity-0"
      >
        <label htmlFor="nickname">Nickname (leave blank)</label>
        <input
          id="nickname"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between border-b border-rule pb-4">
        <p className="text-sm font-medium text-ink-muted">
          Step {currentStep} of {TOTAL_STEPS}
        </p>
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 w-6 rounded-full transition ${
                i < currentStep ? "bg-accent" : "bg-rule"
              }`}
            />
          ))}
        </div>
      </div>

      {topError ? (
        <div
          role="alert"
          className="rounded-card border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
        >
          {topError}
        </div>
      ) : null}

      {currentStep === 1 && (
        <>
          <Section
        index={1}
        title="Your clinic"
        description="The basics — what your patients call you, and where to reach you."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div data-field="name" className="sm:col-span-2">
            <FieldShell
              label="Clinic name"
              htmlFor="name"
              error={fieldError(errors, "name")}
            >
              <input
                id="name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bentonville Family Dental"
                autoComplete="organization"
                required
              />
            </FieldShell>
          </div>
          <div data-field="slug" className="sm:col-span-2">
            <FieldShell
              label="Slug"
              htmlFor="slug"
              optional
              hint={`Your site will live at dreamcreate.web/${slug || slugPlaceholder || "your-clinic"}. Leave blank to auto-generate.`}
              error={fieldError(errors, "slug")}
            >
              <input
                id="slug"
                className={inputClass}
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                }
                placeholder={slugPlaceholder}
                pattern="[a-z0-9-]+"
                autoComplete="off"
              />
            </FieldShell>
          </div>
          <div data-field="contactName">
            <FieldShell
              label="Primary contact"
              htmlFor="contactName"
              error={fieldError(errors, "contactName")}
            >
              <input
                id="contactName"
                className={inputClass}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Dr. Jane Doe"
                autoComplete="name"
                required
              />
            </FieldShell>
          </div>
          <div data-field="contactEmail">
            <FieldShell
              label="Email"
              htmlFor="contactEmail"
              error={fieldError(errors, "contactEmail")}
            >
              <input
                id="contactEmail"
                type="email"
                inputMode="email"
                className={inputClass}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="hello@yourclinic.com"
                autoComplete="email"
                required
              />
            </FieldShell>
          </div>
          <div data-field="contactPhone" className="sm:col-span-2">
            <FieldShell
              label="Phone"
              htmlFor="contactPhone"
              error={fieldError(errors, "contactPhone")}
            >
              <input
                id="contactPhone"
                type="tel"
                inputMode="tel"
                className={inputClass}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(479) 555-0142"
                autoComplete="tel"
                required
              />
            </FieldShell>
          </div>
        </div>
      </Section>

      <Section
        index={2}
        title="Address"
        description="The location patients will find on Maps and in your footer."
      >
        <div className="grid gap-5 sm:grid-cols-6">
          <div data-field="address.line1" className="sm:col-span-6">
            <FieldShell
              label="Street address"
              htmlFor="line1"
              error={fieldError(errors, "address.line1")}
            >
              <input
                id="line1"
                className={inputClass}
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="123 Main St"
                autoComplete="address-line1"
                required
              />
            </FieldShell>
          </div>
          <div data-field="address.line2" className="sm:col-span-6">
            <FieldShell
              label="Suite / unit"
              htmlFor="line2"
              optional
              error={fieldError(errors, "address.line2")}
            >
              <input
                id="line2"
                className={inputClass}
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                placeholder="Suite 200"
                autoComplete="address-line2"
              />
            </FieldShell>
          </div>
          <div data-field="address.city" className="sm:col-span-3">
            <FieldShell
              label="City"
              htmlFor="city"
              error={fieldError(errors, "address.city")}
            >
              <input
                id="city"
                className={inputClass}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bentonville"
                autoComplete="address-level2"
                required
              />
            </FieldShell>
          </div>
          <div data-field="address.state" className="sm:col-span-1">
            <FieldShell
              label="State"
              htmlFor="state"
              error={fieldError(errors, "address.state")}
            >
              <input
                id="state"
                className={`${inputClass} uppercase tracking-widest`}
                value={stateCode}
                onChange={(e) =>
                  setStateCode(e.target.value.toUpperCase().slice(0, 2))
                }
                maxLength={2}
                autoComplete="address-level1"
                required
              />
            </FieldShell>
          </div>
          <div data-field="address.postalCode" className="sm:col-span-2">
            <FieldShell
              label="ZIP"
              htmlFor="postalCode"
              error={fieldError(errors, "address.postalCode")}
            >
              <input
                id="postalCode"
                inputMode="numeric"
                className={inputClass}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="72712"
                autoComplete="postal-code"
                required
              />
            </FieldShell>
          </div>
        </div>
      </Section>
        </>
      )}

      {currentStep === 2 && (
        <>
      <Section
        index={3}
        title="Brand"
        description="Choose a template and the colors we'll use to make the site feel like yours."
      >
        {/* Template picker */}
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted mb-3">
            Template style
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["warm", "modern"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTemplate(t)}
                className={`rounded-card border-2 px-4 py-4 text-left transition ${
                  template === t
                    ? "border-accent bg-accent-soft"
                    : "border-rule bg-white hover:border-ink/30"
                }`}
              >
                <p className="font-medium text-ink capitalize">{t}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {t === "warm"
                    ? "Traditional serif typography, warm earthy tones."
                    : "Clean sans-serif, minimal layout, high contrast."}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div data-field="brand.primaryColor">
            <FieldShell
              label="Primary color"
              hint="Used on headers, buttons, and accents."
              error={fieldError(errors, "brand.primaryColor")}
            >
              <ColorPicker
                value={primaryColor}
                onChange={setPrimaryColor}
                label="primary"
              />
            </FieldShell>
          </div>
          <div data-field="brand.accentColor">
            <FieldShell
              label="Accent color"
              hint="A softer, secondary tone for highlights."
              error={fieldError(errors, "brand.accentColor")}
            >
              <ColorPicker
                value={accentColor}
                onChange={setAccentColor}
                label="accent"
              />
            </FieldShell>
          </div>
          <div data-field="brand.logoUrl" className="sm:col-span-2">
            <LogoUploadField
              value={logoUrl}
              onChange={setLogoUrl}
              error={fieldError(errors, "brand.logoUrl")}
            />
          </div>
        </div>
      </Section>

      <Section
        index={4}
        title="Services"
        description="Pick everything you offer — patients use these to decide if you're a fit."
      >
        <div data-field="services">
          <div className="flex flex-wrap gap-2">
            {SERVICE_CATALOG.map((svc) => {
              const active = selectedCatalog.has(svc);
              return (
                <button
                  key={svc}
                  type="button"
                  onClick={() => toggleCatalog(svc)}
                  aria-pressed={active}
                  className={`rounded-pill border px-4 py-2 text-sm transition ${
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-rule bg-white text-ink hover:border-ink/40"
                  }`}
                >
                  {svc}
                </button>
              );
            })}
          </div>
          {fieldError(errors, "services") ? (
            <p className="mt-3 text-xs text-red-700" role="alert">
              {fieldError(errors, "services")}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-medium text-ink">
              Anything else you offer?
            </h3>
            <button
              type="button"
              onClick={addExtraService}
              className="text-xs font-medium uppercase tracking-[0.16em] text-accent underline-offset-4 hover:underline"
            >
              + Add service
            </button>
          </div>
          {extraServices.length === 0 ? (
            <p className="text-xs text-ink-muted">
              Add custom services we don&rsquo;t list above.
            </p>
          ) : null}
          {extraServices.map((row, idx) => (
            <div
              key={idx}
              className="grid gap-3 rounded-card border border-rule bg-white p-4 sm:grid-cols-[1fr_2fr_auto]"
            >
              <input
                className={inputClass}
                value={row.name}
                onChange={(e) =>
                  updateExtraService(idx, { name: e.target.value })
                }
                placeholder="Service name"
              />
              <input
                className={inputClass}
                value={row.description}
                onChange={(e) =>
                  updateExtraService(idx, { description: e.target.value })
                }
                placeholder="Short description (optional)"
              />
              <button
                type="button"
                onClick={() => removeExtraService(idx)}
                className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted hover:text-ink"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Section>
        </>
      )}

      {currentStep === 3 && (
        <>
      <Section
        index={5}
        title="Team"
        description="Patients trust faces. Add at least the lead dentist; more is better."
      >
        <div className="flex flex-col gap-4">
          {team.map((row, idx) => (
            <div
              key={idx}
              data-field={`team.${idx}.name`}
              className="rounded-card border border-rule bg-white p-5"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-medium text-ink">
                  Team member {idx + 1}
                </h3>
                {team.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeTeam(idx)}
                    className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted hover:text-ink"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FieldShell
                  label="Name"
                  error={fieldError(errors, `team.${idx}.name`)}
                >
                  <input
                    className={inputClass}
                    value={row.name}
                    onChange={(e) => updateTeam(idx, { name: e.target.value })}
                    placeholder="Dr. Jane Doe"
                    autoComplete="off"
                  />
                </FieldShell>
                <FieldShell
                  label="Role"
                  error={fieldError(errors, `team.${idx}.role`)}
                >
                  <input
                    className={inputClass}
                    value={row.role}
                    onChange={(e) => updateTeam(idx, { role: e.target.value })}
                    placeholder="Founder & DDS"
                    autoComplete="off"
                  />
                </FieldShell>
                <div className="sm:col-span-2">
                  <FieldShell
                    label="Bio"
                    optional
                    error={fieldError(errors, `team.${idx}.bio`)}
                  >
                    <textarea
                      className={`${inputClass} min-h-[80px] resize-y`}
                      value={row.bio}
                      onChange={(e) =>
                        updateTeam(idx, { bio: e.target.value })
                      }
                      maxLength={280}
                      placeholder="A sentence or two — what makes them special?"
                    />
                  </FieldShell>
                </div>
                <div className="sm:col-span-2">
                  <FieldShell
                    label="Photo URL"
                    optional
                    error={fieldError(errors, `team.${idx}.photoUrl`)}
                  >
                    <input
                      type="url"
                      className={inputClass}
                      value={row.photoUrl}
                      onChange={(e) =>
                        updateTeam(idx, { photoUrl: e.target.value })
                      }
                      placeholder="https://..."
                      autoComplete="off"
                    />
                  </FieldShell>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addTeam}
            className="self-start text-xs font-medium uppercase tracking-[0.16em] text-accent underline-offset-4 hover:underline"
          >
            + Add team member
          </button>
        </div>
      </Section>

      <Section
        index={6}
        title="Hours"
        description="Default to your usual schedule — patients see this on every page."
      >
        <div className="overflow-hidden rounded-card border border-rule bg-white">
          {hours.map((row) => (
            <div
              key={row.day}
              className="flex flex-col gap-3 border-b border-rule px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-6"
            >
              <div className="w-28 text-sm font-medium text-ink">
                {DAY_LABELS[row.day]}
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={row.closed}
                  onChange={(e) =>
                    updateHours(row.day, { closed: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-rule text-accent focus:ring-accent-soft"
                />
                Closed
              </label>
              <div
                className={`flex flex-1 items-center gap-3 ${row.closed ? "opacity-40" : ""}`}
              >
                <input
                  type="time"
                  className={`${inputClass} w-full max-w-[140px] py-2`}
                  value={row.open}
                  onChange={(e) =>
                    updateHours(row.day, { open: e.target.value })
                  }
                  disabled={row.closed}
                  aria-label={`${DAY_LABELS[row.day]} open time`}
                />
                <span className="text-sm text-ink-muted">to</span>
                <input
                  type="time"
                  className={`${inputClass} w-full max-w-[140px] py-2`}
                  value={row.close}
                  onChange={(e) =>
                    updateHours(row.day, { close: e.target.value })
                  }
                  disabled={row.closed}
                  aria-label={`${DAY_LABELS[row.day]} close time`}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        index={7}
        title="Social & links"
        description="Anywhere we should send patients."
        optional
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FieldShell
            label="Current website"
            htmlFor="website"
            optional
            error={fieldError(errors, "social.website")}
          >
            <input
              id="website"
              type="url"
              className={inputClass}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
              autoComplete="off"
            />
          </FieldShell>
          <FieldShell
            label="Google Business"
            htmlFor="google"
            optional
            error={fieldError(errors, "social.google")}
          >
            <input
              id="google"
              type="url"
              className={inputClass}
              value={google}
              onChange={(e) => setGoogle(e.target.value)}
              placeholder="https://g.page/..."
              autoComplete="off"
            />
          </FieldShell>
          <FieldShell
            label="Facebook"
            htmlFor="facebook"
            optional
            error={fieldError(errors, "social.facebook")}
          >
            <input
              id="facebook"
              type="url"
              className={inputClass}
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/..."
              autoComplete="off"
            />
          </FieldShell>
          <FieldShell
            label="Instagram"
            htmlFor="instagram"
            optional
            error={fieldError(errors, "social.instagram")}
          >
            <input
              id="instagram"
              type="url"
              className={inputClass}
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/..."
              autoComplete="off"
            />
          </FieldShell>
        </div>
      </Section>
        </>
      )}

      <div className="sticky bottom-0 -mx-6 border-t border-rule bg-canvas/90 px-6 py-5 backdrop-blur sm:mx-0 sm:rounded-card sm:border sm:px-6">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">
            {currentStep === TOTAL_STEPS
              ? "We'll review and follow up within ~24 hours."
              : `Step ${currentStep} of ${TOTAL_STEPS}`}
          </p>
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="rounded-pill border border-rule bg-white px-6 py-3 text-sm font-medium text-ink shadow-sm transition hover:border-ink/40"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-pill bg-accent px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-ink disabled:opacity-60"
            >
              {submitting
                ? "Submitting…"
                : currentStep === TOTAL_STEPS
                  ? "Submit clinic profile"
                  : `Next`}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Section({
  index,
  title,
  description,
  optional,
  children,
}: {
  index: number;
  title: string;
  description: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-rule pt-10 first:border-t-0 first:pt-0">
      <div className="mb-6 flex items-baseline gap-3">
        <span className="font-display text-2xl text-accent">
          {String(index).padStart(2, "0")}
        </span>
        <div>
          <h2 className="font-display text-2xl text-ink">
            {title}
            {optional ? (
              <span className="ml-3 align-middle text-xs font-sans uppercase tracking-[0.16em] text-ink-muted">
                Optional
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function LogoUploadField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (url: string) => void;
  error?: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/onboard/upload-logo", { method: "POST", body: fd });
      const json = (await res.json()) as { ok: boolean; logoUrl?: string; error?: string };
      if (json.ok && json.logoUrl) {
        onChange(json.logoUrl);
      } else {
        setUploadError(
          json.error === "invalid_file_type"
            ? "Only PNG, JPG, SVG, and WebP files are allowed."
            : json.error === "file_too_large"
              ? "File must be 5 MB or smaller."
              : "Upload failed. Please try again or paste a URL below.",
        );
      }
    } catch {
      setUploadError("Upload failed. Please try again or paste a URL below.");
    } finally {
      setUploading(false);
    }
  }

  const displayError = uploadError ?? error ?? null;

  return (
    <FieldShell label="Logo" optional error={displayError}>
      <div className="flex flex-col gap-3">
        {/* File drop zone */}
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-rule bg-white px-5 py-8 transition hover:border-ink/30"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Logo preview"
              className="max-h-20 max-w-[200px] object-contain"
            />
          ) : (
            <p className="text-sm text-ink-muted">
              {uploading ? "Uploading…" : "Drag a file here"}
            </p>
          )}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded-pill border border-rule bg-white px-4 py-2 text-xs font-medium text-ink shadow-sm transition hover:border-ink/40 disabled:opacity-60"
          >
            {uploading ? "Uploading…" : value ? "Replace file" : "Choose file"}
          </button>
          <p className="text-xs text-ink-muted">PNG, JPG, SVG or WebP · max 5 MB</p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />

        {/* URL fallback */}
        <div className="flex items-center gap-2">
          <hr className="flex-1 border-rule" />
          <span className="text-xs text-ink-muted">or paste a URL</span>
          <hr className="flex-1 border-rule" />
        </div>
        <input
          id="logoUrl"
          type="url"
          className={inputClass}
          value={value}
          onChange={(e) => {
            setUploadError(null);
            onChange(e.target.value);
          }}
          placeholder="https://yourclinic.com/logo.svg"
          autoComplete="off"
        />
      </div>
    </FieldShell>
  );
}

function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-rule bg-white px-3 py-2">
      <input
        type="color"
        aria-label={`${label} color picker`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-10 cursor-pointer rounded-md border-0 bg-transparent p-0"
      />
      <input
        type="text"
        aria-label={`${label} hex value`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent font-mono text-sm text-ink outline-none"
        spellCheck={false}
        maxLength={7}
      />
    </div>
  );
}
