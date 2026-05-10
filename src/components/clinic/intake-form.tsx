"use client";

import { useState } from "react";

import type { IntakeFormTemplate, IntakeSection } from "@/src/db/schema";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

type Props = {
  slug: string;
  template: IntakeFormTemplate;
};

export function IntakeForm({ slug, template }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "submitting" });
    setErrors({});

    const form = event.currentTarget;
    const data = new FormData(form);

    const responses: Record<string, unknown> = {};
    for (const section of template.sections) {
      for (const field of section.fields) {
        const responseKey = `${section.key}.${field.key}`;
        if (field.type === "checklist") {
          responses[responseKey] = data.getAll(responseKey);
        } else if (field.type === "checkbox") {
          responses[responseKey] = data.get(responseKey) === "on";
        } else {
          const val = String(data.get(responseKey) ?? "").trim();
          if (val) responses[responseKey] = val;
        }
      }
    }

    const patientNameField = template.sections
      .find((s) => s.key === "personal_info")
      ?.fields.find((f) => f.key === "full_name");
    const patientEmailField = template.sections
      .find((s) => s.key === "personal_info")
      ?.fields.find((f) => f.key === "email");
    const patientDobField = template.sections
      .find((s) => s.key === "personal_info")
      ?.fields.find((f) => f.key === "dob");

    const patientNameKey = patientNameField
      ? `personal_info.full_name`
      : undefined;
    const patientEmailKey = patientEmailField
      ? `personal_info.email`
      : undefined;
    const patientDobKey = patientDobField ? `personal_info.dob` : undefined;

    const payload = {
      patientName: patientNameKey
        ? String(responses[patientNameKey] ?? "")
        : String(data.get("patientName") ?? ""),
      patientEmail: patientEmailKey
        ? String(responses[patientEmailKey] ?? "")
        : String(data.get("patientEmail") ?? ""),
      patientDob: patientDobKey
        ? String(responses[patientDobKey] ?? "")
        : undefined,
      responses,
      nickname: String(data.get("nickname") ?? ""),
    };

    try {
      const res = await fetch(`/api/clinic/${slug}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        fieldErrors?: Record<string, string[]>;
      };
      if (!res.ok || !json.ok) {
        if (json.fieldErrors) setErrors(json.fieldErrors);
        setStatus({
          kind: "error",
          message:
            json.message ??
            "We couldn't submit your intake form. Please try again.",
        });
        return;
      }
      setStatus({ kind: "success" });
      form.reset();
    } catch {
      setStatus({ kind: "error", message: "Network error — please try again." });
    }
  }

  if (status.kind === "success") {
    return (
      <div
        role="status"
        className="rounded-card border border-rule bg-white p-8"
      >
        <p
          className="text-xs font-medium uppercase tracking-[0.22em]"
          style={{ color: "var(--clinic-primary)" }}
        >
          Form submitted
        </p>
        <p className="mt-3 font-display text-2xl text-ink">
          Thank you — we&rsquo;ve received your intake form.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Our team will review it before your appointment. See you soon!
        </p>
      </div>
    );
  }

  const submitting = status.kind === "submitting";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-10"
    >
      <div className="hidden">
        <label htmlFor="nickname">Nickname</label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {template.sections.map((section) => (
        <SectionBlock
          key={section.key}
          section={section}
          errors={errors}
        />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-rule bg-white p-6">
        <p className="text-xs text-ink-muted">
          Your information is protected under HIPAA and will only be used to
          provide care.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center rounded-pill px-6 text-sm font-medium shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{
            background: "var(--clinic-primary)",
            color: "var(--clinic-primary-fg)",
          }}
        >
          {submitting ? "Submitting…" : "Submit intake form"}
        </button>
      </div>

      {status.kind === "error" ? (
        <p
          role="alert"
          className="rounded-card border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {status.message}
        </p>
      ) : null}

      <style>{`
        .intake-input {
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
        .intake-input:focus {
          outline: none;
          border-color: var(--clinic-primary);
          box-shadow: 0 0 0 3px var(--clinic-primary-soft);
        }
      `}</style>
    </form>
  );
}

function SectionBlock({
  section,
  errors,
}: {
  section: IntakeSection;
  errors: Record<string, string[]>;
}) {
  return (
    <div className="rounded-card border border-rule bg-white p-6 sm:p-8">
      <h2 className="font-display text-xl text-ink">{section.title}</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {section.fields.map((field) => {
          const responseKey = `${section.key}.${field.key}`;
          const fieldErrors = errors[responseKey];

          if (field.type === "checklist") {
            return (
              <div key={field.key} className="sm:col-span-2">
                <fieldset>
                  <legend className="block text-sm font-medium text-ink">
                    {field.label}
                  </legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(field.options ?? []).map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2 text-sm text-ink"
                      >
                        <input
                          type="checkbox"
                          name={responseKey}
                          value={opt}
                          className="h-4 w-4 rounded border-rule accent-[var(--clinic-primary)]"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {fieldErrors ? (
                  <p className="mt-1 text-xs text-red-700">
                    {fieldErrors.join(" ")}
                  </p>
                ) : null}
              </div>
            );
          }

          if (field.type === "checkbox") {
            return (
              <div key={field.key} className="sm:col-span-2">
                <label className="flex items-start gap-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    name={responseKey}
                    required={field.required}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-rule accent-[var(--clinic-primary)]"
                  />
                  <span>{field.label}</span>
                </label>
                {fieldErrors ? (
                  <p className="mt-1 text-xs text-red-700">
                    {fieldErrors.join(" ")}
                  </p>
                ) : null}
              </div>
            );
          }

          if (field.type === "textarea") {
            return (
              <div key={field.key} className="sm:col-span-2">
                <label
                  htmlFor={responseKey}
                  className="block text-sm font-medium text-ink"
                >
                  {field.label}
                  {field.required ? null : (
                    <span className="ml-1 text-ink-muted">(optional)</span>
                  )}
                </label>
                <div className="mt-1.5">
                  <textarea
                    id={responseKey}
                    name={responseKey}
                    required={field.required}
                    rows={3}
                    placeholder={field.placeholder}
                    className="intake-input resize-y"
                  />
                </div>
                {fieldErrors ? (
                  <p className="mt-1 text-xs text-red-700">
                    {fieldErrors.join(" ")}
                  </p>
                ) : null}
              </div>
            );
          }

          return (
            <div key={field.key}>
              <label
                htmlFor={responseKey}
                className="block text-sm font-medium text-ink"
              >
                {field.label}
                {field.required ? null : (
                  <span className="ml-1 text-ink-muted">(optional)</span>
                )}
              </label>
              <div className="mt-1.5">
                <input
                  id={responseKey}
                  name={responseKey}
                  type={field.type}
                  required={field.required}
                  placeholder={field.placeholder}
                  autoComplete={autoCompleteFor(field.type)}
                  className="intake-input"
                />
              </div>
              {fieldErrors ? (
                <p className="mt-1 text-xs text-red-700">
                  {fieldErrors.join(" ")}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function autoCompleteFor(type: string): string {
  if (type === "email") return "email";
  if (type === "tel") return "tel";
  if (type === "date") return "bday";
  return "off";
}
