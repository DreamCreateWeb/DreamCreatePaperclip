import { redirect } from "next/navigation";
import { inArray } from "drizzle-orm";

import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { getDb } from "@/src/db/client";
import { clinics } from "@/src/db/schema";
import { listUptimeMonitors } from "@/src/lib/uptime";

export const dynamic = "force-dynamic";

const STATUS_CONFIG = {
  up: { label: "Up", dot: "bg-emerald-500", text: "text-emerald-700" },
  down: { label: "Down", dot: "bg-red-500", text: "text-red-700" },
  paused: { label: "Paused", dot: "bg-stone-400", text: "text-stone-600" },
  validating: { label: "Validating", dot: "bg-amber-400", text: "text-amber-700" },
  pending: { label: "Pending", dot: "bg-amber-400", text: "text-amber-700" },
} as const;

export default async function UptimePage() {
  const user = await getCurrentAdminUser();
  if (!user) redirect("/login");

  const db = getDb();

  const monitoredClinics = await db
    .select({
      id: clinics.id,
      slug: clinics.slug,
      name: clinics.name,
      status: clinics.status,
      customDomain: clinics.customDomain,
      uptimeMonitorId: clinics.uptimeMonitorId,
    })
    .from(clinics)
    .where(
      inArray(clinics.status, ["live", "paused", "past_due", "cancelled"]),
    )
    .orderBy(clinics.name);

  const monitored = monitoredClinics.filter((c) => c.uptimeMonitorId !== null);
  const unmonitored = monitoredClinics.filter((c) => !c.uptimeMonitorId);

  const uptimeSummaries = await listUptimeMonitors();
  const summaryMap = new Map(uptimeSummaries.map((s) => [s.monitorId, s]));

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Dream Create · Admin
        </p>
        <a
          href="/admin"
          className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          ← Back
        </a>
      </header>

      <section className="mt-12">
        <h1 className="font-display text-4xl text-ink">Uptime monitor</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Live status from BetterStack — checks every 60 s, alerts after one
          re-check. Monitors pause automatically when a clinic is
          past-due or cancelled.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Monitored clinics ({monitored.length})
        </h2>

        {monitored.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            No monitors registered yet. They are created automatically when a
            clinic is provisioned.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-rule rounded-card border border-rule bg-white">
            {monitored.map((clinic) => {
              const summary = clinic.uptimeMonitorId
                ? summaryMap.get(clinic.uptimeMonitorId)
                : undefined;
              const effectiveStatus =
                summary?.status ?? (clinic.uptimeMonitorId ? "pending" : "paused");
              const cfg =
                STATUS_CONFIG[effectiveStatus as keyof typeof STATUS_CONFIG] ??
                STATUS_CONFIG.pending;

              const siteUrl = clinic.customDomain
                ? `https://${clinic.customDomain}`
                : `/sites/${clinic.slug}`;

              const avail =
                summary && effectiveStatus !== "paused"
                  ? `${summary.availability.toFixed(1)}%`
                  : "—";

              return (
                <li
                  key={clinic.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {clinic.name}
                    </p>
                    <a
                      href={siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-xs text-ink-muted underline-offset-2 hover:underline"
                    >
                      {siteUrl}
                    </a>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-semibold ${cfg.text}`}>
                      {cfg.label}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">{avail} avail.</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {unmonitored.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
            No monitor registered ({unmonitored.length})
          </h2>
          <ul className="mt-4 divide-y divide-rule rounded-card border border-rule bg-white">
            {unmonitored.map((clinic) => (
              <li
                key={clinic.id}
                className="flex items-center gap-4 px-5 py-4"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full bg-stone-300"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {clinic.name}
                  </p>
                  <p className="text-xs text-ink-muted capitalize">
                    {clinic.status}
                  </p>
                </div>
                <p className="text-xs text-ink-muted">No monitor</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
