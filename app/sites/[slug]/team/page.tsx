import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClinicHeader } from "@/src/components/clinic/header";
import { CtaBand } from "@/src/components/clinic/cta-band";
import { TeamGrid } from "@/src/components/clinic/team-grid";
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
  const lead = clinic.team[0];
  const description = lead
    ? `Meet the ${clinic.name} team, led by ${lead.name}, ${lead.role}.`
    : `Meet the people behind ${clinic.name}.`;
  return buildClinicMetadata({
    clinic,
    pageTitle: "Team",
    description,
    pathSuffix: "/team",
  });
}

export default async function ClinicTeamPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();

  const basePath = `/sites/${clinic.slug}`;
  const city = clinic.address?.city;

  return (
    <>
      <ClinicHeader clinic={clinic} basePath={basePath} current="team" />
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
              Our team
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
              People who&rsquo;ll remember your name.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
              {city
                ? `A team rooted in ${city}, with a quiet pride in doing this work the right way.`
                : "A small team that takes pride in doing this work the right way."}
            </p>
          </div>
        </section>
        <div className="-mt-px">
          <TeamGrid team={clinic.team} />
        </div>
        <CtaBand clinic={clinic} basePath={basePath} />
      </main>
    </>
  );
}
