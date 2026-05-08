import Link from "next/link";
import type { Route } from "next";
import type { Clinic } from "@/src/db/schema";
import { telHref } from "@/src/lib/clinic/format";

type Props = {
  clinic: Clinic;
  basePath: string;
};

export function ClinicHero({ clinic, basePath }: Props) {
  const city = clinic.address?.city;
  const phone = telHref(clinic.contactPhone);
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--clinic-primary-soft)" }}
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 sm:py-24 lg:grid-cols-12 lg:py-28">
        <div className="lg:col-span-7">
          <p
            className="text-xs font-medium uppercase tracking-[0.22em]"
            style={{ color: "var(--clinic-primary)" }}
          >
            {city ? `${city}, ${clinic.address?.state ?? ""}` : "Welcome"}
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.04] text-ink sm:text-6xl lg:text-[4.25rem]">
            {clinic.name}.
            <br />
            <span style={{ color: "var(--clinic-primary)" }}>
              Dentistry done right.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
            Comfortable visits, careful work, and a team that remembers your
            name. Same-day appointments available — most insurance accepted.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href={`${basePath}/contact` as unknown as Route}
              className="inline-flex h-11 items-center rounded-pill px-6 text-sm font-medium shadow-sm transition-opacity hover:opacity-90"
              style={{
                background: "var(--clinic-primary)",
                color: "var(--clinic-primary-fg)",
              }}
            >
              Book a visit
            </Link>
            {phone ? (
              <a
                href={phone}
                className="inline-flex h-11 items-center rounded-pill border border-rule bg-white px-6 text-sm font-medium text-ink shadow-sm hover:border-ink/30"
              >
                Call {clinic.contactPhone}
              </a>
            ) : null}
          </div>
        </div>

        <div className="hidden lg:col-span-5 lg:block">
          <div
            aria-hidden
            className="relative aspect-[4/5] w-full overflow-hidden rounded-card shadow-xl"
            style={{ background: "var(--clinic-primary)" }}
          >
            <div
              className="absolute inset-0 opacity-30 mix-blend-screen"
              style={{
                background:
                  "radial-gradient(120% 90% at 90% 10%, var(--clinic-accent), transparent 60%)",
              }}
            />
            <div
              className="absolute inset-x-8 bottom-8 rounded-card border border-white/15 p-5 text-sm"
              style={{ color: "var(--clinic-primary-fg)" }}
            >
              <p className="text-xs uppercase tracking-[0.18em] opacity-80">
                Now welcoming new patients
              </p>
              <p className="mt-2 font-display text-2xl">
                Same-day care · Sedation available
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
