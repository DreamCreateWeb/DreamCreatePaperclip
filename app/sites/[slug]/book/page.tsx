import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { ClinicHeader } from "@/src/components/clinic/header";
import { BookingForm } from "@/src/components/clinic/booking-form";
import { resolveBookingConfig } from "@/src/lib/booking/booking-config";
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
  const description = `Book an appointment with ${clinic.name}. Pick a time that works for you — we'll confirm by email.`;
  return buildClinicMetadata({
    clinic,
    pageTitle: "Book a visit",
    description,
    pathSuffix: "/book",
  });
}

export default async function ClinicBookPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();

  const basePath = `/sites/${clinic.slug}`;
  const config = resolveBookingConfig(clinic);
  const phone = telHref(clinic.contactPhone);

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
              Book a visit
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
              Pick a time that works for you.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
              Choose a service, pick a slot, and we&rsquo;ll confirm by email.
              {phone ? (
                <>
                  {" "}
                  Prefer to call?{" "}
                  <a
                    className="text-accent underline underline-offset-4"
                    href={phone}
                  >
                    {clinic.contactPhone}
                  </a>
                  .
                </>
              ) : null}
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-3xl px-6 py-16">
          {config.enabled ? (
            <BookingForm clinic={clinic} config={config} />
          ) : (
            <div className="rounded-card border border-rule bg-white p-8 text-sm text-ink-muted">
              Online booking isn&rsquo;t available right now. Please use the{" "}
              <Link
                href={`${basePath}/contact` as unknown as Route}
                className="text-accent underline underline-offset-4"
              >
                contact form
              </Link>
              {phone ? (
                <>
                  {" "}
                  or call{" "}
                  <a className="text-accent underline" href={phone}>
                    {clinic.contactPhone}
                  </a>
                </>
              ) : null}
              .
            </div>
          )}
        </section>
      </main>
    </>
  );
}
