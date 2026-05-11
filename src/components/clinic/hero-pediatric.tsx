import Link from "next/link";
import type { Route } from "next";
import type { Clinic } from "@/src/db/schema";
import { telHref } from "@/src/lib/clinic/format";

type Props = {
  clinic: Clinic;
  basePath: string;
};

const TRUST_BADGES = [
  { label: "Kid-Friendly Environment", icon: "✦" },
  { label: "Gentle Care", icon: "✦" },
  { label: "Free First Visit", icon: "✦" },
];

export function ClinicHeroPediatric({ clinic, basePath }: Props) {
  const city = clinic.address?.city;
  const phone = telHref(clinic.contactPhone);

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--clinic-primary)" }}
    >
      <div
        className="absolute inset-0 opacity-15"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% -10%, var(--clinic-accent), transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24 lg:grid lg:grid-cols-12 lg:gap-10 lg:py-28">
        <div className="lg:col-span-7">
          <p
            className="text-xs font-medium uppercase tracking-[0.22em] opacity-80"
            style={{ color: "var(--clinic-primary-fg)" }}
          >
            {city
              ? `Pediatric Dentistry · ${city}, ${clinic.address?.state ?? ""}`
              : "Pediatric Dentistry · Healthy Smiles Start Here"}
          </p>

          <h1
            className="mt-4 font-display text-5xl leading-[1.04] sm:text-6xl lg:text-[4.25rem]"
            style={{ color: "var(--clinic-primary-fg)" }}
          >
            {clinic.name}.
            <br />
            <span style={{ color: "var(--clinic-accent)" }}>
              Making dental visits fun&apos;
            </span>
          </h1>

          <p
            className="mt-6 max-w-xl text-lg leading-relaxed opacity-85"
            style={{ color: "var(--clinic-primary-fg)" }}
          >
            We make dental care comfortable and enjoyable for kids of all ages.
            Our team knows how to work with children — we listen, we're gentle,
            and we make every visit a positive experience for both kids and
            parents.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href={`${basePath}/book` as unknown as Route}
              className="inline-flex h-11 items-center rounded-pill px-6 text-sm font-medium shadow-sm transition-opacity hover:opacity-90"
              style={{
                background: "var(--clinic-accent)",
                color: "var(--clinic-accent-fg)",
              }}
            >
              Schedule first visit
            </Link>
            {phone ? (
              <a
                href={phone}
                className="inline-flex h-11 items-center rounded-pill border border-white/25 px-6 text-sm font-medium transition hover:border-white/50"
                style={{ color: "var(--clinic-primary-fg)" }}
              >
                Call us
              </a>
            ) : null}
          </div>

          <div className="mt-12 flex flex-col gap-3 text-sm">
            {TRUST_BADGES.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-2 opacity-85"
                style={{ color: "var(--clinic-primary-fg)" }}
              >
                <span className="text-xl">{badge.icon}</span>
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
