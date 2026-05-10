import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";
import {
  listIntakeSubmissionsForClinic,
  logIntakeSubmissionView,
} from "@/src/lib/intake/intake-service";
import type { IntakeSubmissionStatus } from "@/src/db/schema";

import { IntakeRowActions } from "./intake-row-actions";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "reviewed", label: "Reviewed" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const STATUS_TONES: Record<string, { label: string; tone: string }> = {
  pending: { label: "Pending", tone: "bg-amber-100 text-amber-900" },
  reviewed: { label: "Reviewed", tone: "bg-emerald-100 text-emerald-900" },
  archived: { label: "Archived", tone: "bg-stone-200 text-stone-800" },
};

export default async function OwnerIntakePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const owner = await getCurrentClinicOwner();
  if (!owner) return null;

  const params = await searchParams;
  const rawFilter = (params.filter ?? "pending") as FilterKey;
  const filter: FilterKey = FILTERS.some((f) => f.key === rawFilter)
    ? rawFilter
    : "pending";

  const statuses =
    filter === "all"
      ? undefined
      : ([filter] as [IntakeSubmissionStatus]);

  const submissions = await listIntakeSubmissionsForClinic(owner.clinic.id, {
    statuses,
  });

  // Audit-log that the owner viewed this list (HIPAA trail)
  if (submissions.length > 0) {
    await Promise.all(
      submissions.map((s) =>
        logIntakeSubmissionView(s.id, owner.clinic.id, owner.user.id),
      ),
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Intake Forms
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] text-ink">
          Patient intake submissions
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          Review patient intake forms submitted before appointments. All views
          are logged for HIPAA compliance.
        </p>
      </header>

      <nav
        aria-label="Filter intake submissions"
        className="flex flex-wrap items-center gap-1 border-b border-rule"
      >
        {FILTERS.map((f) => {
          const active = f.key === filter;
          const href =
            f.key === "pending"
              ? "/portal/intake"
              : `/portal/intake?filter=${f.key}`;
          return (
            <a
              key={f.key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "border-b-2 px-4 py-2 text-sm transition " +
                (active
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-muted hover:border-rule hover:text-ink")
              }
            >
              {f.label}
            </a>
          );
        })}
      </nav>

      {submissions.length === 0 ? (
        <div className="rounded-card border border-rule bg-white p-10 text-center">
          <p className="text-sm font-medium text-ink">
            No {filter === "all" ? "" : filter} intake submissions
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            When patients complete their intake form, submissions will appear
            here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {submissions.map((s) => {
            const tone = STATUS_TONES[s.status] ?? {
              label: s.status,
              tone: "bg-stone-200 text-stone-800",
            };
            return (
              <li
                key={s.id}
                className="rounded-card border border-rule bg-white p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {s.patientName}
                      <span
                        className={`ml-3 inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${tone.tone}`}
                      >
                        {tone.label}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      <a
                        className="hover:underline"
                        href={`mailto:${s.patientEmail}`}
                      >
                        {s.patientEmail}
                      </a>
                      {s.patientDob ? <> · DOB: {s.patientDob}</> : null}
                    </p>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {new Date(s.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {s.reviewedAt ? (
                  <p className="mt-2 text-xs text-ink-muted">
                    Reviewed{" "}
                    {new Date(s.reviewedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                ) : null}

                <ResponseSummary responses={s.responses} />

                <div className="mt-4 border-t border-rule pt-3">
                  <IntakeRowActions
                    submissionId={s.id}
                    status={s.status as "pending" | "reviewed" | "archived"}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ResponseSummary({ responses }: { responses: Record<string, unknown> }) {
  const entries = Object.entries(responses).filter(([, v]) => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "boolean") return v;
    return v !== "" && v !== null && v !== undefined;
  });

  if (entries.length === 0) return null;

  const visible = entries.slice(0, 6);

  return (
    <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      {visible.map(([key, value]) => {
        const label = key.split(".").pop()?.replace(/_/g, " ") ?? key;
        const display = Array.isArray(value)
          ? value.join(", ")
          : typeof value === "boolean"
            ? value
              ? "Yes"
              : "No"
            : String(value);
        return (
          <div key={key} className="flex gap-2">
            <dt className="capitalize text-ink-muted">{label}:</dt>
            <dd className="truncate text-ink">{display}</dd>
          </div>
        );
      })}
      {entries.length > 6 ? (
        <p className="text-xs text-ink-muted sm:col-span-2">
          +{entries.length - 6} more fields
        </p>
      ) : null}
    </dl>
  );
}
