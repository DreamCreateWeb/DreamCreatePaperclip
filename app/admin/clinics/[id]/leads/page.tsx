import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { getDb, schema } from "@/src/db/client";
import { listIntakeSubmissionsForClinic } from "@/src/lib/intake/intake-service";
import { IntakeLeadsTable } from "./intake-leads-table";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ClinicLeadsPage({ params }: { params: Params }) {
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

  const submissions = await listIntakeSubmissionsForClinic(id);

  // Audit-log the inbox view — decryption occurred for all returned rows
  if (submissions.length > 0) {
    await db.insert(schema.auditEvents).values({
      actor: `admin:${admin.id}`,
      action: "admin.intake.inbox_viewed",
      entityType: "intake_submission",
      entityId: null,
      payload: { clinicId: id, count: submissions.length },
    });
  }

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  // Serialize dates to ISO strings for client component boundary
  const serialized = submissions.map((s) => ({
    id: s.id,
    clinicId: s.clinicId,
    patientName: s.patientName,
    patientEmail: s.patientEmail,
    patientDob: s.patientDob ?? null,
    responses: s.responses,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
  }));

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

      <nav className="mt-6">
        <Link
          href={`/admin/clinics/${id}`}
          className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          ← {clinic.name}
        </Link>
      </nav>

      <section className="mt-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Patient leads · {clinic.name}
        </p>
        <h1 className="mt-1 font-display text-4xl leading-[1.05] text-ink">
          Intake inbox
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Decrypted PHI — access is audit-logged.{" "}
          {pendingCount > 0 && (
            <span className="font-medium text-ink">
              {pendingCount} new{" "}
              {pendingCount === 1 ? "submission" : "submissions"} awaiting
              review.
            </span>
          )}
        </p>
      </section>

      <section className="mt-10">
        {serialized.length === 0 ? (
          <div className="rounded-card border border-rule bg-white p-10 text-center">
            <p className="text-sm font-medium text-ink">No submissions yet</p>
            <p className="mt-2 text-sm text-ink-muted">
              Patient intake form submissions will appear here.
            </p>
          </div>
        ) : (
          <IntakeLeadsTable submissions={serialized} clinicId={id} />
        )}
      </section>
    </main>
  );
}
