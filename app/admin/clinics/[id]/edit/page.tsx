import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { getDb, schema } from "@/src/db/client";

import { EditForm } from "./edit-form";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ClinicEditPage({ params }: { params: Params }) {
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

      <nav className="mt-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
        <Link href="/admin/clinics" className="underline underline-offset-4 hover:text-ink">
          All clinics
        </Link>
        <span>›</span>
        <Link
          href={`/admin/clinics/${id}`}
          className="underline underline-offset-4 hover:text-ink"
        >
          {clinic.name}
        </Link>
        <span>›</span>
        <span>Edit</span>
      </nav>

      <section className="mt-8">
        <h1 className="font-display text-4xl leading-[1.05] text-ink">
          Edit site
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Changes are committed to the clinic&apos;s GitHub repo and trigger a Vercel
          redeploy.
        </p>
      </section>

      <div className="mt-10">
        <EditForm
          clinicId={clinic.id}
          initial={{
            name: clinic.name,
            services: clinic.services,
            team: clinic.team,
            brand: clinic.brand ?? null,
            hours: clinic.hours ?? null,
          }}
        />
      </div>
    </main>
  );
}
