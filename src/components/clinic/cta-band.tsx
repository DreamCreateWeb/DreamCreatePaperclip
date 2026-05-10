import Link from "next/link";
import type { Route } from "next";
import { telHref } from "@/src/lib/clinic/format";
import type { Clinic } from "@/src/db/schema";

type Props = {
  clinic: Clinic;
  basePath: string;
};

export function CtaBand({ clinic, basePath }: Props) {
  const phone = telHref(clinic.contactPhone);
  return (
    <section
      className="relative"
      style={{ background: "var(--clinic-primary)" }}
    >
      <div
        className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 sm:flex-row sm:items-center sm:py-20"
        style={{ color: "var(--clinic-primary-fg)" }}
      >
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] opacity-80">
            New patients welcome
          </p>
          <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
            Let&rsquo;s get you on the schedule.
          </h2>
          <p className="mt-3 max-w-md text-base opacity-90">
            Most appointments booked within a week. We&rsquo;ll confirm by
            phone or email — your choice.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`${basePath}/book` as unknown as Route}
            className="inline-flex h-11 items-center rounded-pill bg-white px-6 text-sm font-medium text-ink shadow-sm transition-opacity hover:opacity-90"
          >
            Request an appointment
          </Link>
          {phone ? (
            <a
              href={phone}
              className="inline-flex h-11 items-center rounded-pill border border-white/40 px-6 text-sm font-medium hover:bg-white/10"
            >
              Call {clinic.contactPhone}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
