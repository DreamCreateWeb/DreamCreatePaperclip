"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { ClinicTeamMember } from "@/src/db/schema";

const fieldClass =
  "w-full rounded-card border border-rule bg-white px-4 py-3 text-base text-ink shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";
const labelClass =
  "text-xs font-medium uppercase tracking-[0.16em] text-ink-muted";

const MAX_TEAM = 40;

type Row = {
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
};

function toRows(team: ClinicTeamMember[]): Row[] {
  if (team.length === 0) {
    return [{ name: "", role: "", bio: "", photoUrl: "" }];
  }
  return team.map((m) => ({
    name: m.name ?? "",
    role: m.role ?? "",
    bio: m.bio ?? "",
    photoUrl: m.photoUrl ?? "",
  }));
}

export function TeamEditor({ initial }: { initial: ClinicTeamMember[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    if (rows.length >= MAX_TEAM) return;
    setRows((prev) => [
      ...prev,
      { name: "", role: "", bio: "", photoUrl: "" },
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    setRows((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function getError(path: string): string | undefined {
    return errors[path]?.[0];
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const payload = {
      team: rows.map((row) => ({
        name: row.name.trim(),
        role: row.role.trim(),
        bio: row.bio.trim() || undefined,
        photoUrl: row.photoUrl.trim() || undefined,
      })),
    };

    try {
      const res = await fetch("/api/owner/clinic/team", {
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
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      <ul className="space-y-4">
        {rows.map((row, i) => {
          const photoSrc = row.photoUrl.trim();
          return (
            <li
              key={i}
              className="rounded-card border border-rule bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                  Member {i + 1}
                </p>
                <div className="flex items-center gap-1">
                  <RowButton
                    label="Move up"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                  >
                    ↑
                  </RowButton>
                  <RowButton
                    label="Move down"
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1}
                  >
                    ↓
                  </RowButton>
                  <RowButton
                    label="Remove"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                    tone="danger"
                  >
                    ×
                  </RowButton>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[120px_1fr]">
                <div className="space-y-2">
                  <span className={labelClass}>Photo</span>
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-card border border-rule bg-canvas text-xs text-ink-muted">
                    {photoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoSrc}
                        alt={row.name || "Team member"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>No photo</span>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Name"
                      error={
                        getError(`team.${i}.name`) || getError(`team.${i}`)
                      }
                    >
                      <input
                        className={fieldClass}
                        value={row.name}
                        onChange={(e) => update(i, { name: e.target.value })}
                        maxLength={120}
                        required
                      />
                    </Field>
                    <Field label="Role" error={getError(`team.${i}.role`)}>
                      <input
                        className={fieldClass}
                        value={row.role}
                        onChange={(e) => update(i, { role: e.target.value })}
                        placeholder="e.g. Lead Dentist"
                        maxLength={120}
                        required
                      />
                    </Field>
                  </div>
                  <Field
                    label="Photo URL (optional)"
                    error={getError(`team.${i}.photoUrl`)}
                    hint="Hosted image URL. Square photos look best."
                  >
                    <input
                      className={fieldClass}
                      value={row.photoUrl}
                      onChange={(e) => update(i, { photoUrl: e.target.value })}
                      type="url"
                      placeholder="https://"
                      maxLength={500}
                    />
                  </Field>
                  <Field
                    label="Bio (optional)"
                    error={getError(`team.${i}.bio`)}
                  >
                    <textarea
                      className={`${fieldClass} min-h-24 resize-y`}
                      value={row.bio}
                      onChange={(e) => update(i, { bio: e.target.value })}
                      maxLength={280}
                      placeholder="One or two sentences."
                    />
                  </Field>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= MAX_TEAM}
          className="rounded-pill border border-rule bg-white px-4 py-2 text-sm text-ink hover:border-ink disabled:opacity-50"
        >
          + Add team member
        </button>
        <p className="text-xs text-ink-muted">
          {rows.length} of {MAX_TEAM}
        </p>
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
              Reorder with the arrow buttons. Save to publish.
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

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <div className="mt-2">{children}</div>
      {hint && !error ? (
        <p className="mt-1 text-xs text-ink-muted">{hint}</p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

function RowButton({
  label,
  onClick,
  disabled,
  children,
  tone,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={
        "inline-flex h-8 w-8 items-center justify-center rounded-card border text-sm transition disabled:cursor-not-allowed disabled:opacity-30 " +
        (tone === "danger"
          ? "border-rule text-red-700 hover:border-red-700 hover:bg-red-50"
          : "border-rule text-ink-muted hover:border-ink hover:text-ink")
      }
    >
      {children}
    </button>
  );
}
