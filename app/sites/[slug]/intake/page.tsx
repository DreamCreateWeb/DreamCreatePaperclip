import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClinicHeader } from "@/src/components/clinic/header";
import { IntakeForm } from "@/src/components/clinic/intake-form";
import { getClinicBySlug } from "@/src/lib/clinic/get-clinic";
import { buildClinicMetadata } from "@/src/lib/clinic/page-metadata";
import { ensureDefaultTemplate } from "@/src/lib/intake/intake-service";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) return { title: "Not found", robots: { index: false } };
  return buildClinicMetadata({
    clinic,
    pageTitle: "Patient intake form",
    description: `Complete your patient intake form for ${clinic.name} before your appointment.`,
    pathSuffix: "/intake",
  });
}

export default async function ClinicIntakePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();

  const template = await ensureDefaultTemplate(clinic.id);
  const basePath = `/sites/${clinic.slug}`;

  return (
    <>
      <ClinicHeader clinic={clinic} basePath={basePath} current="contact" />
      <main>
        <section
          className="border-b border-rule"
          style={{ background: "var(--clinic-primary-soft)" }}
        >
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <p
              className="text-xs font-medium uppercase tracking-[0.22em]"
              style={{ color: "var(--clinic-primary)" }}
            >
              Patient intake
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
              Complete your intake form.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
              Please fill this out before your first visit. It only takes a few
              minutes and helps us provide the best care possible.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-3xl px-6 py-16">
          <IntakeForm slug={clinic.slug} template={template} />
        </section>
      </main>
    </>
  );
}
