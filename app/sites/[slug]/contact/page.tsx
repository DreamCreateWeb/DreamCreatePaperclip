import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClinicHeader } from "@/src/components/clinic/header";
import { ContactForm } from "@/src/components/clinic/contact-form";
import { HoursLocationCard } from "@/src/components/clinic/hours-card";
import { MapEmbed } from "@/src/components/clinic/map-embed";
import { telHref } from "@/src/lib/clinic/format";
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
  const description = `Get in touch with ${clinic.name}. Call, email, or send a message — we'll get back to you within one business day.`;
  return buildClinicMetadata({
    clinic,
    pageTitle: "Contact",
    description,
    pathSuffix: "/contact",
  });
}

export default async function ClinicContactPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();

  const basePath = `/sites/${clinic.slug}`;
  const phone = telHref(clinic.contactPhone);

  return (
    <>
      <ClinicHeader clinic={clinic} basePath={basePath} current="contact" />
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
              Contact
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
              Let&rsquo;s talk.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
              Send a message, call us, or stop by. We&rsquo;ll respond within
              one business day.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {phone ? (
                <a
                  href={phone}
                  className="font-medium hover:underline"
                  style={{ color: "var(--clinic-primary)" }}
                >
                  {clinic.contactPhone}
                </a>
              ) : null}
              <a
                href={`mailto:${clinic.contactEmail}`}
                className="font-medium hover:underline"
                style={{ color: "var(--clinic-primary)" }}
              >
                {clinic.contactEmail}
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ContactForm slug={clinic.slug} />
            </div>
            <div className="lg:col-span-2">
              <MapEmbed address={clinic.address} clinicName={clinic.name} />
            </div>
          </div>
        </section>

        <HoursLocationCard clinic={clinic} basePath={basePath} />
      </main>
    </>
  );
}
