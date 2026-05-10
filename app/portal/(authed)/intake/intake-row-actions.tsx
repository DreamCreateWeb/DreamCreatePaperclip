"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Status = "pending" | "reviewed" | "archived";

const PRIMARY_ACTIONS: Record<Status, ReadonlyArray<{ label: string; next: Status }>> = {
  pending: [{ label: "Mark reviewed", next: "reviewed" }],
  reviewed: [{ label: "Archive", next: "archived" }],
  archived: [{ label: "Restore to pending", next: "pending" }],
};

type Props = {
  submissionId: string;
  status: Status;
};

export function IntakeRowActions({ submissionId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const actions = PRIMARY_ACTIONS[status] ?? [];

  function update(next: Status) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/owner/intake/${submissionId}`, {
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => update(action.next)}
          disabled={pending}
          className="rounded-pill border border-rule px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted transition hover:border-ink hover:text-ink disabled:opacity-50"
        >
          {action.label}
        </button>
      ))}
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}
