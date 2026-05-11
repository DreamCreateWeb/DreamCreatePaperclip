import { redirect } from "next/navigation";
import { desc, eq, isNull } from "drizzle-orm";

import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { getDb, schema } from "@/src/db/client";
import { LeadsTable } from "./leads-table";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const admin = await getCurrentAdminUser();
  if (!admin) redirect("/login");

  const db = getDb();

  const leads = await db
    .select({
      id: schema.leads.id,
      clinicId: schema.leads.clinicId,
      clinicName: schema.clinics.name,
      clinicSlug: schema.clinics.slug,
      name: schema.leads.name,
      email: schema.leads.email,
      phone: schema.leads.phone,
      message: schema.leads.message,
      createdAt: schema.leads.createdAt,
      readAt: schema.leads.readAt,
    })
    .from(schema.leads)
    .leftJoin(schema.clinics, eq(schema.leads.clinicId, schema.clinics.id))
    .orderBy(desc(schema.leads.createdAt));

  const unreadCount = await db
    .select({ count: schema.leads.id })
    .from(schema.leads)
    .where(isNull(schema.leads.readAt))
    .then((rows) => rows.length);

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-6 py-16">
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
          Lead inbox
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-muted">
          Review contact form submissions from clinic websites.{" "}
          {unreadCount > 0 && (
            <span className="font-medium text-ink">
              {unreadCount} unread
            </span>
          )}
        </p>
      </section>

      <section className="mt-10">
        {leads.length === 0 ? (
          <div className="rounded-card border border-rule bg-white p-10 text-center">
            <p className="text-sm font-medium text-ink">No leads yet</p>
            <p className="mt-2 text-sm text-ink-muted">
              Contact form submissions will appear here.
            </p>
          </div>
        ) : (
          <LeadsTable leads={leads} />
        )}
      </section>
    </main>
  );
}
