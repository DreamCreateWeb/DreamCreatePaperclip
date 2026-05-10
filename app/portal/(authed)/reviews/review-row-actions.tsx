"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ReviewStatus = "pending" | "published" | "hidden";

type Props = {
  reviewId: string;
  status: ReviewStatus;
  clinicResponse: string | null;
};

const STATUS_ACTIONS: Record<ReviewStatus, ReadonlyArray<{ label: string; next: ReviewStatus }>> = {
  pending: [
    { label: "Approve", next: "published" },
    { label: "Hide", next: "hidden" },
  ],
  published: [{ label: "Hide", next: "hidden" }],
  hidden: [
    { label: "Publish", next: "published" },
    { label: "Back to pending", next: "pending" },
  ],
};

export function ReviewRowActions({ reviewId, status, clinicResponse }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [responseText, setResponseText] = useState(clinicResponse ?? "");

  function updateStatus(next: ReviewStatus) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/owner/reviews/${reviewId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}) as { error?: string });
          setError(body?.error ?? "Update failed");
          return;
        }
        router.refresh();
      } catch {
        setError("Network error");
      }
    });
  }

  function submitResponse() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/owner/reviews/${reviewId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinicResponse: responseText.trim() || null }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}) as { error?: string });
          setError(body?.error ?? "Update failed");
          return;
        }
        setResponding(false);
        router.refresh();
      } catch {
        setError("Network error");
      }
    });
  }

  const actions = STATUS_ACTIONS[status] ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => updateStatus(action.next)}
            disabled={pending}
            className="rounded-pill border border-rule px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted transition hover:border-ink hover:text-ink disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setResponding((v) => !v)}
          disabled={pending}
          className="rounded-pill border border-rule px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted transition hover:border-ink hover:text-ink disabled:opacity-50"
        >
          {clinicResponse ? "Edit response" : "Respond"}
        </button>
        {error ? <span className="text-xs text-red-700">{error}</span> : null}
      </div>

      {responding ? (
        <div className="rounded-card border border-rule bg-canvas p-4">
          <label className="block text-xs font-medium text-ink-muted">
            Your response (visible to patients)
          </label>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={3}
            maxLength={2000}
            className="mt-2 w-full rounded border border-rule bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1"
            style={{ "--tw-ring-color": "var(--clinic-primary)" } as React.CSSProperties}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={submitResponse}
              disabled={pending}
              className="rounded-pill border border-rule px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted transition hover:border-ink hover:text-ink disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setResponding(false); setResponseText(clinicResponse ?? ""); }}
              className="rounded-pill border border-transparent px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
