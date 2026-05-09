"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const fieldClass =
  "w-full rounded-card border border-rule bg-white px-4 py-3 text-base text-ink shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";
const labelClass =
  "text-xs font-medium uppercase tracking-[0.16em] text-ink-muted";

export function ContactEmailForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function getError(path: string): string | undefined {
    return errors[path]?.[0];
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      const res = await fetch("/api/owner/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactEmail: email.trim() }),
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
  const fieldError = getError("contactEmail");

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4 rounded-card border border-rule bg-white p-6"
    >
      <label className="block">
        <span className={labelClass}>Contact email</span>
        <input
          className={`mt-2 ${fieldClass}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          required
        />
        {fieldError ? (
          <p className="mt-1 text-xs text-red-600">{fieldError}</p>
        ) : null}
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          {generalError ? (
            <span className="text-red-600">{generalError}</span>
          ) : savedAt ? (
            <span className="text-ink-muted">
              Saved at {savedAt.toLocaleTimeString()}.
            </span>
          ) : (
            <span className="text-ink-muted">
              Updates publish to your public site immediately.
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-pill bg-accent px-5 py-2 text-sm font-medium text-white transition hover:bg-ink disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
