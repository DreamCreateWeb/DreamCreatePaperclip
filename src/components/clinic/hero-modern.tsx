import Link from "next/link";
import type { Route } from "next";
import type { Clinic } from "@/src/db/schema";
import { telHref } from "@/src/lib/clinic/format";

type Props = {
  clinic: Clinic;
  basePath: string;
};

// Modern minimalist hero: full-width, centered, white background with a
// bold accent bar and clean sans-serif typography.
export function ClinicHeroModern({ clinic, basePath }: Props) {
  const city = clinic.address?.city;
  const phone = telHref(clinic.contactPhone);

  return (
    <section className="relative bg-white border-b border-rule">
      {/* Thin accent bar at top */}
      <div
        className="h-1.5 w-full"
        style={{ background: "var(--clinic-primary)" }}
        aria-hidden
      />

      <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
        {city ? (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-muted">
            {city}, {clinic.address?.state ?? ""}
          </p>
        ) : null}

        <h1 className="mt-4 font-display text-5xl leading-[1.06] text-ink sm:text-6xl lg:text-[4rem]">
          {clinic.name}
        </h1>

        <p
          className="mt-3 text-xl font-medium"
          style={{ color: "var(--clinic-primary)" }}
        >
          Modern dentistry. Exceptional care.
        </p>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-muted">
          A patient-first practice committed to your comfort and long-term oral
          health. Same-day appointments — most insurance accepted.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`${basePath}/book` as unknown as Route}
            className="inline-flex h-12 items-center rounded-pill px-7 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
            style={{
              background: "var(--clinic-primary)",
              color: "var(--clinic-primary-fg)",
            }}
          >
            Book an Appointment
          </Link>
          {phone ? (
            <a
              href={phone}
              className="inline-flex h-12 items-center rounded-pill border-2 border-rule px-7 text-sm font-semibold text-ink hover:border-ink/40 transition"
            >
              {clinic.contactPhone}
            </a>
          ) : null}
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-muted">
          <span>✓ Same-day appointments</span>
          <span>✓ Most insurance accepted</span>
          <span>✓ New patients welcome</span>
        </div>
      </div>
    </section>
  );
}
