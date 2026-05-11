"use client";

import { useState } from "react";
import Link from "next/link";

interface Lead {
  id: string;
  clinicId: string;
  clinicName: string | null;
  clinicSlug: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  createdAt: Date;
  readAt: Date | null;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  const d = new Date(date);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function markAsRead(leadId: string) {
  await fetch(`/api/admin/leads/${leadId}/read`, { method: "POST" });
}

function truncateMessage(message: string, maxLength: number = 120): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + "…";
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(
    new Set(leads.filter((l) => l.readAt).map((l) => l.id)),
  );

  const handleExpandClick = async (lead: Lead) => {
    setExpandedId(expandedId === lead.id ? null : lead.id);

    if (!readIds.has(lead.id) && !lead.readAt) {
      await markAsRead(lead.id);
      setReadIds((prev) => new Set([...prev, lead.id]));
    }
  };

  return (
    <div className="overflow-x-auto rounded-card border border-rule bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rule">
            <th className="px-6 py-4 text-left font-medium text-ink-muted">
              Clinic
            </th>
            <th className="px-6 py-4 text-left font-medium text-ink-muted">
              Patient
            </th>
            <th className="px-6 py-4 text-left font-medium text-ink-muted">
              Email
            </th>
            <th className="px-6 py-4 text-left font-medium text-ink-muted">
              Phone
            </th>
            <th className="px-6 py-4 text-left font-medium text-ink-muted">
              Message
            </th>
            <th className="px-6 py-4 text-right font-medium text-ink-muted">
              Received
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const isExpanded = expandedId === lead.id;
            const isRead = readIds.has(lead.id) || lead.readAt;

            return (
              <div key={lead.id}>
                <tr
                  className={`border-b border-rule cursor-pointer transition hover:bg-gray-50 ${
                    isRead ? "" : "bg-blue-50"
                  }`}
                  onClick={() => handleExpandClick(lead)}
                >
                  <td className="px-6 py-4">
                    {lead.clinicSlug ? (
                      <Link
                        href={`/admin/clinics`}
                        className="text-accent underline"
                      >
                        {lead.clinicName || lead.clinicSlug}
                      </Link>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className={`px-6 py-4 ${!isRead ? "font-medium" : ""}`}>
                    {lead.name}
                  </td>
                  <td className="px-6 py-4 text-ink-muted">{lead.email}</td>
                  <td className="px-6 py-4 text-ink-muted">
                    {lead.phone || "—"}
                  </td>
                  <td className="px-6 py-4 max-w-xs text-ink-muted">
                    {truncateMessage(lead.message)}
                  </td>
                  <td className="px-6 py-4 text-right text-ink-muted">
                    {getRelativeTime(lead.createdAt)}
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="border-b border-rule bg-gray-50">
                    <td colSpan={6} className="px-6 py-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                            Full message
                          </p>
                          <p className="mt-3 whitespace-pre-wrap text-sm text-ink">
                            {lead.message}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4 sm:grid-cols-4">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                              Name
                            </p>
                            <p className="mt-1 text-sm text-ink">{lead.name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                              Email
                            </p>
                            <p className="mt-1 text-sm text-ink">
                              <a
                                href={`mailto:${lead.email}`}
                                className="text-accent underline"
                              >
                                {lead.email}
                              </a>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                              Phone
                            </p>
                            <p className="mt-1 text-sm text-ink">
                              {lead.phone ? (
                                <a
                                  href={`tel:${lead.phone}`}
                                  className="text-accent underline"
                                >
                                  {lead.phone}
                                </a>
                              ) : (
                                "—"
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                              Clinic
                            </p>
                            <p className="mt-1 text-sm text-ink">
                              {lead.clinicName || lead.clinicSlug || "—"}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-rule pt-4">
                          <p className="text-xs text-ink-muted">
                            Submitted{" "}
                            {new Date(lead.createdAt).toLocaleString()}
                          </p>
                          {lead.readAt && (
                            <p className="mt-1 text-xs text-ink-muted">
                              Read {new Date(lead.readAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </div>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
