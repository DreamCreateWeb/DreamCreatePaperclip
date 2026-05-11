import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";

import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { getDb, schema } from "@/src/db/client";
import {
  getClinicBadges,
  SENTRY_BADGE_CONFIG,
  STRIPE_BADGE_CONFIG,
  VERCEL_BADGE_CONFIG,
} from "@/src/lib/admin/clinic-badges";

export const dynamic = "force-dynamic";

const CLINIC_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_payment: "Pending payment",
  provisioning: "Provisioning",
  live: "Live",
  paused: "Paused",
  past_due: "Past due",
  cancelled: "Cancelled",
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 py-3 border-b border-rule last:border-0">
      <dt className="w-40 shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </dt>
      <dd className="text-sm text-ink">{value ?? "—"}</dd>
    </div>
  );
}

type Params = Promise<{ id: string }>;

export default async function ClinicDetailPage({ params }: { params: Params }) {
  const admin = await getCurrentAdminUser();
  if (!admin) redirect("/login");

  const { id } = await params;
  const db = getDb();

  const [clinic] = await db
    .select()
    .from(schema.clinics)
    .where(eq(schema.clinics.id, id))
    .limit(1);

  if (!clinic) notFound();

  const [owner] = await db
    .select()
    .from(schema.clinicOwnerUsers)
    .where(eq(schema.clinicOwnerUsers.clinicId, id))
    .limit(1);

  const [pendingRow] = await db
    .select({ value: count() })
    .from(schema.intakeSubmissions)
    .where(
      and(
        eq(schema.intakeSubmissions.clinicId, id),
        eq(schema.intakeSubmissions.status, "pending"),
      ),
    );
  const pendingLeads = pendingRow?.value ?? 0;

  const badges = getClinicBadges(clinic);

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col px-6 py-16">
      <header className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Dream Create · Admin
        </p>
        <form action="/api/admin/auth/logout" method="post">
          <button
            type="submit"
            className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted underline underline-offset-4 hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </header>

      <nav className="mt-6">
        <Link
          href="/admin/clinics"
          className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          ← All clinics
        </Link>
      </nav>

      <section className="mt-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          {CLINIC_STATUS_LABEL[clinic.status] ?? clinic.status}
        </p>
        <h1 className="mt-1 font-display text-4xl leading-[1.05] text-ink">
          {clinic.name}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          /{clinic.slug} · {clinic.contactEmail}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs text-ink-muted">Stripe:</span>
          <Badge
            label={STRIPE_BADGE_CONFIG[badges.stripe].label}
            className={STRIPE_BADGE_CONFIG[badges.stripe].className}
          />
          <span className="ml-1 text-xs text-ink-muted">Vercel:</span>
          <Badge
            label={VERCEL_BADGE_CONFIG[badges.vercel].label}
            className={VERCEL_BADGE_CONFIG[badges.vercel].className}
          />
          <span className="ml-1 text-xs text-ink-muted">Sentry:</span>
          <Badge
            label={SENTRY_BADGE_CONFIG[badges.sentry].label}
            className={SENTRY_BADGE_CONFIG[badges.sentry].className}
          />
        </div>
      </section>

      <section className="mt-10 rounded-card border border-rule bg-white p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Details
        </h2>
        <dl className="mt-4">
          <DetailRow label="ID" value={<code className="text-xs">{clinic.id}</code>} />
          <DetailRow label="Slug" value={clinic.slug} />
          <DetailRow label="Contact email" value={clinic.contactEmail} />
          <DetailRow label="Contact phone" value={clinic.contactPhone} />
          <DetailRow
            label="Address"
            value={
              clinic.address
                ? `${clinic.address.line1}, ${clinic.address.city}, ${clinic.address.state} ${clinic.address.postalCode}`
                : null
            }
          />
          <DetailRow label="Owner" value={owner?.email ?? "— none assigned"} />
          <DetailRow
            label="Owner last login"
            value={
              owner?.lastLoginAt
                ? new Date(owner.lastLoginAt).toLocaleString()
                : null
            }
          />
          <DetailRow
            label="Repo"
            value={
              clinic.repoUrl ? (
                <a
                  href={clinic.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-ink-muted"
                >
                  {clinic.repoUrl}
                </a>
              ) : null
            }
          />
          <DetailRow
            label="Vercel project"
            value={clinic.vercelProjectId}
          />
          <DetailRow
            label="Deployment URL"
            value={
              clinic.vercelDeploymentUrl ? (
                <a
                  href={clinic.vercelDeploymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-ink-muted"
                >
                  {clinic.vercelDeploymentUrl}
                </a>
              ) : null
            }
          />
          <DetailRow label="Custom domain" value={clinic.customDomain} />
          <DetailRow
            label="Stripe customer"
            value={clinic.stripeCustomerId}
          />
          <DetailRow
            label="Stripe subscription"
            value={clinic.stripeSubscriptionId}
          />
          <DetailRow
            label="Created"
            value={new Date(clinic.createdAt).toLocaleString()}
          />
          <DetailRow
            label="Updated"
            value={new Date(clinic.updatedAt).toLocaleString()}
          />
        </dl>
      </section>

      <section className="mt-6 rounded-card border border-rule bg-white p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Patient leads
        </h2>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-ink-muted">
            {pendingLeads > 0 ? (
              <>
                <span className="font-medium text-ink">{pendingLeads} new</span>{" "}
                {pendingLeads === 1 ? "submission" : "submissions"} awaiting
                review.
              </>
            ) : (
              "Intake form submissions from patients."
            )}
          </p>
          <Link
            href={`/admin/clinics/${id}/leads`}
            className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted underline underline-offset-4 hover:text-ink"
          >
            View inbox →
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-card border border-rule bg-white p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Coming soon
        </h2>
        <p className="mt-3 text-sm text-ink-muted">
          Provisioning run history, subscription management, and site preview
          will appear here in a future update.
        </p>
      </section>
    </main>
  );
}
