"use client";

import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; pending: boolean }
  | { kind: "error"; message: string };

type Props = {
  slug: string;
};

const RATINGS = [1, 2, 3, 4, 5] as const;

export function ReviewForm({ slug }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating === 0) {
      setErrors({ rating: ["Please select a star rating."] });
      return;
    }
    setStatus({ kind: "submitting" });
    setErrors({});

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      patientName: String(data.get("patientName") ?? ""),
      rating,
      body: String(data.get("body") ?? ""),
      serviceTag: String(data.get("serviceTag") ?? "") || undefined,
      nickname: String(data.get("nickname") ?? ""),
    };

    try {
      const res = await fetch(`/api/clinic/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        fieldErrors?: Record<string, string[]>;
        pending?: boolean;
      };
      if (!res.ok || !json.ok) {
        if (json.fieldErrors) setErrors(json.fieldErrors);
        setStatus({
          kind: "error",
          message: json.message ?? "We couldn't submit your review. Please try again.",
        });
        return;
      }
      setStatus({ kind: "success", pending: json.pending ?? true });
      form.reset();
      setRating(0);
    } catch {
      setStatus({ kind: "error", message: "Network error — please try again." });
    }
  }

  if (status.kind === "success") {
    return (
      <div role="status" className="rounded-card border border-rule bg-white p-8">
        <p
          className="text-xs font-medium uppercase tracking-[0.22em]"
          style={{ color: "var(--clinic-primary)" }}
        >
          Thank you
        </p>
        <p className="mt-3 font-display text-2xl text-ink">
          {status.pending
            ? "Your review has been received and will appear once approved."
            : "Your review is now live — we appreciate your feedback!"}
        </p>
      </div>
    );
  }

  const submitting = status.kind === "submitting";
  const display = hovered || rating;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-card border border-rule bg-white p-6 sm:p-8"
    >
      <div className="grid gap-5">
        <Field id="patientName" label="Your name" errors={errors.patientName}>
          <input
            id="patientName"
            name="patientName"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            className="input"
          />
        </Field>

        <div>
          <p className="block text-sm font-medium text-ink">Rating</p>
          <div className="mt-2 flex items-center gap-1" role="group" aria-label="Star rating">
            {RATINGS.map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className="text-2xl leading-none transition-transform hover:scale-110 focus:outline-none"
                style={{ color: star <= display ? "var(--clinic-primary)" : "var(--color-rule)" }}
              >
                ★
              </button>
            ))}
          </div>
          {errors.rating ? (
            <p className="mt-1 text-xs text-red-700">{errors.rating.join(" ")}</p>
          ) : null}
        </div>

        <Field id="body" label="Your review" errors={errors.body}>
          <textarea
            id="body"
            name="body"
            required
            minLength={5}
            maxLength={2000}
            rows={5}
            className="input resize-y"
          />
        </Field>

        <Field id="serviceTag" label="Service (optional)" errors={errors.serviceTag}>
          <input
            id="serviceTag"
            name="serviceTag"
            type="text"
            maxLength={80}
            placeholder="e.g. Teeth cleaning"
            className="input"
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
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-ink-muted">
          By submitting, you agree your review may appear publicly on this site.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center rounded-pill px-6 text-sm font-medium shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--clinic-primary)", color: "var(--clinic-primary-fg)" }}
        >
          {submitting ? "Submitting…" : "Submit review"}
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
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {errors && errors.length > 0 ? (
        <p className="mt-1 text-xs text-red-700">{errors.join(" ")}</p>
      ) : null}
    </div>
  );
}
