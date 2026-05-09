import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClinicHeader } from "@/src/components/clinic/header";
import { ClinicHero } from "@/src/components/clinic/hero";
import { CtaBand } from "@/src/components/clinic/cta-band";
import { HoursLocationCard } from "@/src/components/clinic/hours-card";
import { ServicesGrid } from "@/src/components/clinic/services-grid";
import { TeamGrid } from "@/src/components/clinic/team-grid";
import { getClinicBySlug } from "@/src/lib/clinic/get-clinic";
import { localBusinessJsonLd } from "@/src/lib/clinic/jsonld";
import {
  buildClinicMetadata,
  clinicCanonical,
} from "@/src/lib/clinic/page-metadata";

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
  const city = clinic.address?.city;
  const description = city
    ? `${clinic.name} — comfortable, modern dentistry in ${city}, ${
        clinic.address?.state ?? ""
      }. Same-day appointments available.`
    : `${clinic.name} — comfortable, modern dentistry. Same-day appointments available.`;
  return buildClinicMetadata({ clinic, description });
}

export default async function ClinicHomePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();

  const basePath = `/sites/${clinic.slug}`;
  const jsonLd = localBusinessJsonLd(clinic, clinicCanonical(clinic.slug));

  return (
    <>
      <ClinicHeader clinic={clinic} basePath={basePath} current="home" />
      <main>
        <ClinicHero clinic={clinic} basePath={basePath} />
        <ServicesGrid
          services={clinic.services.slice(0, 6)}
          heading="Care for every smile"
          intro="A focused set of services so we can do each one beautifully."
        />
        <TeamGrid
          team={clinic.team.slice(0, 3)}
          heading="The team you'll meet"
          intro="Friendly, credentialed, and genuinely glad to see you."
        />
        <HoursLocationCard clinic={clinic} basePath={basePath} />
        <CtaBand clinic={clinic} basePath={basePath} />
      </main>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
