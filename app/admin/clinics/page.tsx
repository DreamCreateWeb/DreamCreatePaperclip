import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import {
  CLINIC_LIST_PAGE_SIZE,
  listClinicsAdminView,
} from "@/src/lib/owner-portal/admin-invite-service";
import {
  getClinicBadges,
  SENTRY_BADGE_CONFIG,
  STRIPE_BADGE_CONFIG,
  VERCEL_BADGE_CONFIG,
} from "@/src/lib/admin/clinic-badges";

import { OwnerInviteRow } from "./owner-invite-row";
import { ProvisionButton } from "./provision-button";

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

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminClinicsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await getCurrentAdminUser();
  if (!admin) redirect("/login");

  const resolvedParams = await searchParams;
  const rawPage = Number(resolvedParams.page ?? "1");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  let data: Awaited<ReturnType<typeof listClinicsAdminView>> | null = null;
  let loadError = false;

  try {
    data = await listClinicsAdminView(page);
  } catch {
    loadError = true;
  }

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / CLINIC_LIST_PAGE_SIZE))
    : 1;

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-16">
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

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-4xl leading-[1.05] text-ink">
            Clinics
          </h1>
          {data && data.total > 0 && (
            <p className="text-sm text-ink-muted">
              {data.total} clinic{data.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <p className="mt-3 max-w-2xl text-sm text-ink-muted">
          Subscription, deploy, and health status at a glance. Click a row to
          manage details.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        {loadError ? (
          <div className="rounded-card border border-red-200 bg-red-50 p-10 text-center">
            <p className="text-sm font-medium text-red-800">
              Failed to load clinics
            </p>
            <p className="mt-2 text-sm text-red-600">
              Check the database connection and try again.
            </p>
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="rounded-card border border-rule bg-white p-10 text-center">
            <p className="text-sm font-medium text-ink">No clinics yet</p>
            <p className="mt-2 text-sm text-ink-muted">
              Submissions to <code>/onboard</code> will land here once
              converted.
            </p>
          </div>
        ) : (
          data.rows.map(({ clinic, owner }) => {
            const badges = getClinicBadges(clinic);
            return (
              <article
                key={clinic.id}
                className="group rounded-card border border-rule bg-white shadow-sm transition hover:border-ink"
              >
                <Link
                  href={`/admin/clinics/${clinic.id}`}
                  className="block p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                        {CLINIC_STATUS_LABEL[clinic.status] ?? clinic.status}
                      </p>
                      <h2 className="mt-1 font-display text-2xl text-ink group-hover:underline group-hover:underline-offset-2">
                        {clinic.name}
                      </h2>
                      <p className="mt-1 text-xs text-ink-muted">
                        /{clinic.slug} · {clinic.contactEmail}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-ink-muted">Stripe:</span>
                        <Badge
                          label={STRIPE_BADGE_CONFIG[badges.stripe].label}
                          className={STRIPE_BADGE_CONFIG[badges.stripe].className}
                        />
                        <span className="ml-2 text-xs text-ink-muted">
                          Vercel:
                        </span>
                        <Badge
                          label={VERCEL_BADGE_CONFIG[badges.vercel].label}
                          className={VERCEL_BADGE_CONFIG[badges.vercel].className}
                        />
                        <span className="ml-2 text-xs text-ink-muted">
                          Sentry:
                        </span>
                        <Badge
                          label={SENTRY_BADGE_CONFIG[badges.sentry].label}
                          className={SENTRY_BADGE_CONFIG[badges.sentry].className}
                        />
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                        Owner
                      </p>
                      <p className="mt-1 text-sm text-ink">
                        {owner ? owner.email : "— none assigned"}
                      </p>
                      {owner?.lastLoginAt ? (
                        <p className="mt-1 text-xs text-ink-muted">
                          Last login{" "}
                          {new Date(owner.lastLoginAt).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>

                <div className="border-t border-rule px-6 pb-4 pt-3">
                  {(clinic.status === "draft" ||
                    clinic.status === "pending_payment") && (
                    <ProvisionButton clinicId={clinic.id} />
                  )}
                  <OwnerInviteRow
                    clinicId={clinic.id}
                    currentOwnerEmail={owner?.email ?? null}
                  />
                </div>
              </article>
            );
          })
        )}
      </section>

      {totalPages > 1 && (
        <nav
          className="mt-8 flex items-center justify-center gap-2"
          aria-label="Pagination"
        >
          {page > 1 && (
            <Link
              href={`/admin/clinics?page=${page - 1}`}
              className="rounded border border-rule bg-white px-4 py-2 text-sm text-ink hover:border-ink"
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-ink-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/clinics?page=${page + 1}`}
              className="rounded border border-rule bg-white px-4 py-2 text-sm text-ink hover:border-ink"
            >
              Next →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
