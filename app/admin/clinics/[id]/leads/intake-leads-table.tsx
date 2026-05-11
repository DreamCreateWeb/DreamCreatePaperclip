"use client";

import { useState } from "react";

interface Submission {
  id: string;
  clinicId: string;
  patientName: string;
  patientEmail: string;
  patientDob: string | null;
  responses: string;
  status: "pending" | "reviewed" | "archived";
  createdAt: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: "New", className: "bg-blue-100 text-blue-700" },
  reviewed: { label: "Contacted", className: "bg-green-100 text-green-700" },
  archived: { label: "Archived", className: "bg-gray-100 text-gray-600" },
};

function getRelativeTime(iso: string): string {
  const now = Date.now();
  const diffMs = now - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function parseResponses(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function responsePreview(parsed: Record<string, unknown>): string {
  return Object.values(parsed)
    .map((v) => (Array.isArray(v) ? v.join(", ") : String(v)))
    .filter(Boolean)
    .join(" · ")
    .substring(0, 90);
}

async function logView(clinicId: string, submissionId: string) {
  await fetch(`/api/admin/clinics/${clinicId}/leads/${submissionId}/view`, {
    method: "POST",
  });
}

export function IntakeLeadsTable({
  submissions,
  clinicId,
}: {
  submissions: Submission[];
  clinicId: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  const handleRowClick = async (sub: Submission) => {
    const opening = expandedId !== sub.id;
    setExpandedId(opening ? sub.id : null);

    if (opening && !viewedIds.has(sub.id)) {
      setViewedIds((prev) => new Set([...prev, sub.id]));
      await logView(clinicId, sub.id);
    }
  };

  return (
    <div className="overflow-x-auto rounded-card border border-rule bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rule">
            <th className="px-6 py-4 text-left font-medium text-ink-muted">
              Patient
            </th>
            <th className="px-6 py-4 text-left font-medium text-ink-muted">
              Email
            </th>
            <th className="px-6 py-4 text-left font-medium text-ink-muted">
              Preview
            </th>
            <th className="px-6 py-4 text-left font-medium text-ink-muted">
              Status
            </th>
            <th className="px-6 py-4 text-right font-medium text-ink-muted">
              Submitted
            </th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => {
            const isExpanded = expandedId === sub.id;
            const isNew = sub.status === "pending" && !viewedIds.has(sub.id);
            const statusCfg =
              STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.pending;
            const parsed = parseResponses(sub.responses);
            const preview = responsePreview(parsed);

            return (
              <>
                <tr
                  key={sub.id}
                  className={`cursor-pointer border-b border-rule transition hover:bg-gray-50 ${
                    isNew ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleRowClick(sub)}
                >
                  <td
                    className={`px-6 py-4 ${isNew ? "font-medium" : ""}`}
                  >
                    {sub.patientName}
                  </td>
                  <td className="px-6 py-4 text-ink-muted">
                    {sub.patientEmail}
                  </td>
                  <td className="max-w-xs px-6 py-4 text-ink-muted">
                    {preview || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}
                    >
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-ink-muted">
                    {getRelativeTime(sub.createdAt)}
                  </td>
                </tr>

                {isExpanded && (
                  <tr
                    key={`${sub.id}-detail`}
                    className="border-b border-rule bg-gray-50"
                  >
                    <td colSpan={5} className="px-6 py-6">
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                              Name
                            </p>
                            <p className="mt-1 text-sm text-ink">
                              {sub.patientName}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                              Email
                            </p>
                            <p className="mt-1 text-sm text-ink">
                              <a
                                href={`mailto:${sub.patientEmail}`}
                                className="text-accent underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {sub.patientEmail}
                              </a>
                            </p>
                          </div>
                          {sub.patientDob && (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                                Date of birth
                              </p>
                              <p className="mt-1 text-sm text-ink">
                                {sub.patientDob}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                              Status
                            </p>
                            <p className="mt-1">
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}
                              >
                                {statusCfg.label}
                              </span>
                            </p>
                          </div>
                        </div>

                        {Object.keys(parsed).length > 0 && (
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                              Form responses
                            </p>
                            <dl className="mt-3 space-y-2">
                              {Object.entries(parsed).map(([key, value]) => (
                                <div key={key} className="flex gap-4">
                                  <dt className="w-48 shrink-0 text-xs font-medium text-ink-muted">
                                    {key}
                                  </dt>
                                  <dd className="text-sm text-ink">
                                    {Array.isArray(value)
                                      ? value.join(", ")
                                      : String(value ?? "—")}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}

                        <div className="border-t border-rule pt-4">
                          <p className="text-xs text-ink-muted">
                            Submitted{" "}
                            {new Date(sub.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
