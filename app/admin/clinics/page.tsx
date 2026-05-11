import { redirect } from "next/navigation";

import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { listClinicOwners } from "@/src/lib/owner-portal/admin-invite-service";

import { OwnerInviteRow } from "./owner-invite-row";
import { ProvisionButton } from "./provision-button";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_payment: "Pending payment",
  provisioning: "Provisioning",
  live: "Live",
  paused: "Paused",
  past_due: "Past due",
  cancelled: "Cancelled",
};

export default async function AdminClinicsPage() {
  const admin = await getCurrentAdminUser();
  if (!admin) redirect("/login");

  const rows = await listClinicOwners();

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
        <h1 className="font-display text-4xl leading-[1.05] text-ink">
          Clinics & owners
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-muted">
          Assign or replace the portal owner for any clinic. Sending the invite
          emails a magic-link sign-in to the new owner address.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-card border border-rule bg-white p-10 text-center">
            <p className="text-sm font-medium text-ink">No clinics yet</p>
            <p className="mt-2 text-sm text-ink-muted">
              Submissions to <code>/onboard</code> will land here once converted.
            </p>
          </div>
        ) : (
          rows.map(({ clinic, owner }) => (
            <article
              key={clinic.id}
              className="rounded-card border border-rule bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                      {STATUS_LABEL[clinic.status] ?? clinic.status}
                    </p>
                    {clinic.status === "past_due" && (
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Past due
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 font-display text-2xl text-ink">
                    {clinic.name}
                  </h2>
                  <p className="mt-1 text-xs text-ink-muted">
                    /{clinic.slug} · {clinic.contactEmail}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                    Current owner
                  </p>
                  <p className="mt-1 text-sm text-ink">
                    {owner ? owner.email : "— none assigned"}
                  </p>
                  {owner?.lastLoginAt ? (
                    <p className="mt-1 text-xs text-ink-muted">
                      Last login {new Date(owner.lastLoginAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </div>
              {(clinic.status === "draft" ||
                clinic.status === "pending_payment") && (
                <ProvisionButton clinicId={clinic.id} />
              )}
              <OwnerInviteRow
                clinicId={clinic.id}
                currentOwnerEmail={owner?.email ?? null}
              />
            </article>
          ))
        )}
      </section>
    </main>
  );
}
