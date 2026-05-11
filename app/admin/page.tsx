import Link from "next/link";
import { redirect } from "next/navigation";
import { isNull } from "drizzle-orm";

import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { getDb, schema } from "@/src/db/client";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const user = await getCurrentAdminUser();
  if (!user) redirect("/login");

  const db = getDb();
  const unreadLeads = await db
    .select({ count: schema.leads.id })
    .from(schema.leads)
    .where(isNull(schema.leads.readAt))
    .then((rows) => rows.length);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-16">
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
        <h1 className="font-display text-5xl leading-[1.05] text-ink">
          Welcome back.
        </h1>
        <p className="mt-4 text-sm text-ink-muted">
          Signed in as <span className="text-ink">{user.email}</span>.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Manage
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-ink">
          <li>
            <Link
              href="/admin/leads"
              className="group relative block rounded-card border border-rule bg-white px-5 py-4 transition hover:border-ink"
            >
              <div className="flex items-baseline justify-between">
                <div className="flex-1">
                  <span className="font-medium">Lead inbox</span>
                  <span className="block text-ink-muted">
                    Review contact form submissions.
                  </span>
                </div>
                {unreadLeads > 0 && (
                  <span className="ml-3 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                    {unreadLeads}
                  </span>
                )}
              </div>
              <span className="mt-2 block text-xs font-medium uppercase tracking-[0.16em] text-accent group-hover:underline">
                Open →
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/clinics"
              className="group block rounded-card border border-rule bg-white px-5 py-4 transition hover:border-ink"
            >
              <span className="font-medium">Clinics & owners</span>
              <span className="block text-ink-muted">
                Assign or replace the portal owner for any clinic.
              </span>
              <span className="mt-2 block text-xs font-medium uppercase tracking-[0.16em] text-accent group-hover:underline">
                Open →
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/billing"
              className="group block rounded-card border border-rule bg-white px-5 py-4 transition hover:border-ink"
            >
              <span className="font-medium">Billing</span>
              <span className="block text-ink-muted">
                Live Stripe subscription snapshot — active, past-due, and
                churned clinics.
              </span>
              <span className="mt-2 block text-xs font-medium uppercase tracking-[0.16em] text-accent group-hover:underline">
                Open →
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/uptime"
              className="group block rounded-card border border-rule bg-white px-5 py-4 transition hover:border-ink"
            >
              <span className="font-medium">Uptime monitor</span>
              <span className="block text-ink-muted">
                BetterStack availability per clinic — 60 s checks, auto-pause on
                cancellation.
              </span>
              <span className="mt-2 block text-xs font-medium uppercase tracking-[0.16em] text-accent group-hover:underline">
                Open →
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Coming next
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-ink">
          <li className="rounded-card border border-rule bg-white px-5 py-4">
            <span className="font-medium">Onboarding inbox</span>
            <span className="block text-ink-muted">
              Review submissions from <code>/onboard</code> before billing.
            </span>
          </li>
          <li className="rounded-card border border-rule bg-white px-5 py-4">
            <span className="font-medium">Provisioning runs</span>
            <span className="block text-ink-muted">
              Re-run failed steps and inspect provisioning errors.
            </span>
          </li>
        </ul>
      </section>
    </main>
  );
}
