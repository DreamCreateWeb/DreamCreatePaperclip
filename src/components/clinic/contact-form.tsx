"use client";

import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

type Props = {
  slug: string;
};

export function ContactForm({ slug }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "submitting" });
    setErrors({});

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      message: String(data.get("message") ?? ""),
      nickname: String(data.get("nickname") ?? ""),
    };

    try {
      const res = await fetch(`/api/clinic/${slug}/contact`, {
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
            "We couldn't send your message. Please try again or call us directly.",
        });
        return;
      }
      setStatus({ kind: "success" });
      form.reset();
    } catch {
      setStatus({
        kind: "error",
        message: "Network error — please try again.",
      });
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
          Message sent
        </p>
        <p className="mt-3 font-display text-2xl text-ink">
          Thanks — we&rsquo;ll get back to you shortly.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          We typically respond within one business day. For urgent matters,
          please call.
        </p>
      </div>
    );
  }

  const submitting = status.kind === "submitting";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-card border border-rule bg-white p-6 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Your name" errors={errors.name}>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            className="input"
            aria-describedby={errors.name?.length ? "name-error" : undefined}
            aria-invalid={errors.name?.length ? true : undefined}
          />
        </Field>
        <Field id="email" label="Email" errors={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
            className="input"
            aria-describedby={errors.email?.length ? "email-error" : undefined}
            aria-invalid={errors.email?.length ? true : undefined}
          />
        </Field>
        <Field id="phone" label="Phone (optional)" errors={errors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={30}
            className="input"
            aria-describedby={errors.phone?.length ? "phone-error" : undefined}
            aria-invalid={errors.phone?.length ? true : undefined}
          />
        </Field>
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
        <Field
          id="message"
          label="How can we help?"
          errors={errors.message}
          className="sm:col-span-2"
        >
          <textarea
            id="message"
            name="message"
            required
            minLength={5}
            maxLength={2000}
            rows={5}
            className="input resize-y"
            aria-describedby={errors.message?.length ? "message-error" : undefined}
            aria-invalid={errors.message?.length ? true : undefined}
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-ink-muted">
          By sending, you agree we may contact you about your request. We never
          share your details.
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
          {submitting ? "Sending…" : "Send message"}
        </button>
      </div>

      {status.kind === "error" ? (
        <p
          role="alert"
          className="mt-4 rounded-card border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {status.message}
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

function Field({
  id,
  label,
  errors,
  children,
  className,
}: {
  id: string;
  label: string;
  errors?: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-ink"
      >
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {errors && errors.length > 0 ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700">{errors.join(" ")}</p>
      ) : null}
    </div>
  );
}
