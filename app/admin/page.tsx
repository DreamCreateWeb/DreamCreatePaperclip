import { redirect } from "next/navigation";

import { getCurrentAdminUser } from "@/src/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const user = await getCurrentAdminUser();
  if (!user) redirect("/login");

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
          Coming next
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-ink">
          <li className="rounded-card border border-rule bg-white px-5 py-4">
            <span className="font-medium">Clinic dashboard</span>
            <span className="block text-ink-muted">
              List clinics, status pills, primary actions.
            </span>
          </li>
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
