"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { BeforeAfterPair } from "@/src/db/schema";

const fieldClass =
  "w-full rounded-card border border-rule bg-white px-4 py-3 text-base text-ink shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";
const labelClass =
  "text-xs font-medium uppercase tracking-[0.16em] text-ink-muted";

const MAX_PAIRS = 20;

type Row = {
  label: string;
  beforeSrc: string;
  beforeAlt: string;
  afterSrc: string;
  afterAlt: string;
};

function toRows(pairs: BeforeAfterPair[]): Row[] {
  if (pairs.length === 0) {
    return [{ label: "", beforeSrc: "", beforeAlt: "", afterSrc: "", afterAlt: "" }];
  }
  return pairs.map((p) => ({
    label: p.label,
    beforeSrc: p.before.src,
    beforeAlt: p.before.alt,
    afterSrc: p.after.src,
    afterAlt: p.after.alt,
  }));
}

export function BeforeAfterEditor({ initial }: { initial: BeforeAfterPair[] }) {
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
    if (rows.length >= MAX_PAIRS) return;
    setRows((prev) => [
      ...prev,
      { label: "", beforeSrc: "", beforeAlt: "", afterSrc: "", afterAlt: "" },
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

    const nonEmpty = rows.filter(
      (r) => r.label.trim() || r.beforeSrc.trim() || r.afterSrc.trim(),
    );

    const payload = {
      pairs: nonEmpty.map((r) => ({
        label: r.label.trim(),
        before: { src: r.beforeSrc.trim(), alt: r.beforeAlt.trim() },
        after: { src: r.afterSrc.trim(), alt: r.afterAlt.trim() },
      })),
    };

    try {
      const res = await fetch("/api/owner/clinic/before-after", {
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
        {rows.map((row, i) => (
          <li
            key={i}
            className="rounded-card border border-rule bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                Pair {i + 1}
              </p>
              <div className="flex items-center gap-1">
                <RowButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </RowButton>
                <RowButton label="Move down" onClick={() => move(i, 1)} disabled={i === rows.length - 1}>
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

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className={labelClass}>Label</span>
                <input
                  className={`mt-2 ${fieldClass}`}
                  value={row.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  maxLength={80}
                  placeholder="e.g. Teeth Whitening"
                  required
                />
                {getError(`pairs.${i}.label`) ? (
                  <p className="mt-1 text-xs text-red-600">{getError(`pairs.${i}.label`)}</p>
                ) : null}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <fieldset className="space-y-3 rounded-card border border-rule p-4">
                  <legend className={labelClass}>Before</legend>
                  <label className="block">
                    <span className="text-xs text-ink-muted">Image URL</span>
                    <input
                      className={`mt-1 ${fieldClass}`}
                      type="url"
                      placeholder="https://"
                      value={row.beforeSrc}
                      onChange={(e) => update(i, { beforeSrc: e.target.value })}
                      maxLength={500}
                    />
                    {getError(`pairs.${i}.before.src`) ? (
                      <p className="mt-1 text-xs text-red-600">{getError(`pairs.${i}.before.src`)}</p>
                    ) : null}
                  </label>
                  <label className="block">
                    <span className="text-xs text-ink-muted">Alt text</span>
                    <input
                      className={`mt-1 ${fieldClass}`}
                      placeholder="Description for screen readers"
                      value={row.beforeAlt}
                      onChange={(e) => update(i, { beforeAlt: e.target.value })}
                      maxLength={200}
                    />
                    {getError(`pairs.${i}.before.alt`) ? (
                      <p className="mt-1 text-xs text-red-600">{getError(`pairs.${i}.before.alt`)}</p>
                    ) : null}
                  </label>
                </fieldset>

                <fieldset className="space-y-3 rounded-card border border-rule p-4">
                  <legend className={labelClass}>After</legend>
                  <label className="block">
                    <span className="text-xs text-ink-muted">Image URL</span>
                    <input
                      className={`mt-1 ${fieldClass}`}
                      type="url"
                      placeholder="https://"
                      value={row.afterSrc}
                      onChange={(e) => update(i, { afterSrc: e.target.value })}
                      maxLength={500}
                    />
                    {getError(`pairs.${i}.after.src`) ? (
                      <p className="mt-1 text-xs text-red-600">{getError(`pairs.${i}.after.src`)}</p>
                    ) : null}
                  </label>
                  <label className="block">
                    <span className="text-xs text-ink-muted">Alt text</span>
                    <input
                      className={`mt-1 ${fieldClass}`}
                      placeholder="Description for screen readers"
                      value={row.afterAlt}
                      onChange={(e) => update(i, { afterAlt: e.target.value })}
                      maxLength={200}
                    />
                    {getError(`pairs.${i}.after.alt`) ? (
                      <p className="mt-1 text-xs text-red-600">{getError(`pairs.${i}.after.alt`)}</p>
                    ) : null}
                  </label>
                </fieldset>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= MAX_PAIRS}
          className="rounded-pill border border-rule bg-white px-4 py-2 text-sm text-ink hover:border-ink disabled:opacity-50"
        >
          + Add pair
        </button>
        <p className="text-xs text-ink-muted">
          {rows.length} of {MAX_PAIRS}
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
              Empty pairs are skipped on save. Reorder with the arrow buttons.
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
