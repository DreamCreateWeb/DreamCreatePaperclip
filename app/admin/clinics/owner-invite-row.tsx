"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const fieldClass =
  "w-full rounded-card border border-rule bg-white px-4 py-3 text-sm text-ink shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export function OwnerInviteRow({
  clinicId,
  currentOwnerEmail,
}: {
  clinicId: string;
  currentOwnerEmail: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function getError(path: string): string | undefined {
    return errors[path]?.[0];
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setSavedMessage(null);

    try {
      const res = await fetch(
        `/api/admin/clinics/${encodeURIComponent(clinicId)}/owner`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        replaced?: boolean;
        ownerEmail?: string;
        fieldErrors?: Record<string, string[]>;
        error?: string;
      };
      if (res.ok && body.ok) {
        setSavedMessage(
          body.replaced
            ? `Replaced. Magic link sent to ${body.ownerEmail}.`
            : `Owner set. Magic link sent to ${body.ownerEmail}.`,
        );
        setEmail("");
        router.refresh();
      } else if (body.fieldErrors) {
        setErrors(body.fieldErrors);
      } else if (body.error === "clinic_not_found") {
        setErrors({ _: ["Clinic not found."] });
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
  const fieldError = getError("email");

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 grid gap-3 border-t border-rule pt-6 md:grid-cols-[1fr_auto]"
    >
      <div>
        <label className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          {currentOwnerEmail ? "Replace owner email" : "Assign owner email"}
        </label>
        <input
          className={`mt-2 ${fieldClass}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={currentOwnerEmail ?? "owner@yourclinic.com"}
          maxLength={200}
          required
        />
        {fieldError ? (
          <p className="mt-1 text-xs text-red-600">{fieldError}</p>
        ) : null}
        {generalError ? (
          <p className="mt-1 text-xs text-red-600">{generalError}</p>
        ) : null}
        {savedMessage ? (
          <p className="mt-1 text-xs text-emerald-700">{savedMessage}</p>
        ) : null}
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-pill bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-ink disabled:opacity-50"
        >
          {submitting
            ? "Sending…"
            : currentOwnerEmail
              ? "Replace & email link"
              : "Invite & email link"}
        </button>
      </div>
    </form>
  );
}
