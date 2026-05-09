import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClinicHeader } from "@/src/components/clinic/header";
import { CtaBand } from "@/src/components/clinic/cta-band";
import { ServicesGrid } from "@/src/components/clinic/services-grid";
import { getClinicBySlug } from "@/src/lib/clinic/get-clinic";
import { buildClinicMetadata } from "@/src/lib/clinic/page-metadata";

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
  const sample = clinic.services
    .slice(0, 4)
    .map((s) => s.name)
    .join(", ");
  const description = sample
    ? `Services at ${clinic.name} — ${sample}, and more.`
    : `Services and care offered at ${clinic.name}.`;
  return buildClinicMetadata({
    clinic,
    pageTitle: "Services",
    description,
    pathSuffix: "/services",
  });
}

export default async function ClinicServicesPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();

  const basePath = `/sites/${clinic.slug}`;

  return (
    <>
      <ClinicHeader clinic={clinic} basePath={basePath} current="services" />
      <main>
        <section
          className="border-b border-rule"
          style={{ background: "var(--clinic-primary-soft)" }}
        >
          <div className="mx-auto max-w-6xl px-6 py-20">
            <p
              className="text-xs font-medium uppercase tracking-[0.22em]"
              style={{ color: "var(--clinic-primary)" }}
            >
              Services
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
              Everything we do — done well.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
              We keep our menu intentionally focused so we can deliver each
              service with the care and craft it deserves. Don&rsquo;t see what
              you&rsquo;re looking for? Just ask.
            </p>
          </div>
        </section>
        <ServicesGrid services={clinic.services} />
        <CtaBand clinic={clinic} basePath={basePath} />
      </main>
    </>
  );
}
