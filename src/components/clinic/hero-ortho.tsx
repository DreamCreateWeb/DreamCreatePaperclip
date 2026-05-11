import Link from "next/link";
import type { Route } from "next";
import type { Clinic } from "@/src/db/schema";
import { telHref } from "@/src/lib/clinic/format";

type Props = {
  clinic: Clinic;
  basePath: string;
};

const TRUST_BADGES = [
  { label: "Invisalign Provider", icon: "✦" },
  { label: "Interest-Free Financing", icon: "✦" },
  { label: "Free Consultation", icon: "✦" },
];

export function ClinicHeroOrtho({ clinic, basePath }: Props) {
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
              ? `Orthodontics · ${city}, ${clinic.address?.state ?? ""}`
              : "Orthodontics · Braces & Aligners"}
          </p>

          <h1
            className="mt-4 font-display text-5xl leading-[1.04] sm:text-6xl lg:text-[4.25rem]"
            style={{ color: "var(--clinic-primary-fg)" }}
          >
            {clinic.name}.
            <br />
            <span style={{ color: "var(--clinic-accent)" }}>
              Straighter smiles, faster.
            </span>
          </h1>

          <p
            className="mt-6 max-w-xl text-lg leading-relaxed opacity-85"
            style={{ color: "var(--clinic-primary-fg)" }}
          >
            Invisalign, clear braces, and traditional braces — the right
            treatment for your smile and your life. Start with a free
            orthodontic consultation.
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
              Book free consult
            </Link>
            {phone ? (
              <a
                href={phone}
                className="inline-flex h-11 items-center rounded-pill border border-white/25 px-6 text-sm font-medium transition hover:border-white/50"
                style={{ color: "var(--clinic-primary-fg)" }}
              >
                Call {clinic.contactPhone}
              </a>
            ) : null}
          </div>

          <ul className="mt-8 flex flex-wrap gap-4">
            {TRUST_BADGES.map((b) => (
              <li
                key={b.label}
                className="flex items-center gap-2 text-sm font-medium opacity-80"
                style={{ color: "var(--clinic-primary-fg)" }}
              >
                <span style={{ color: "var(--clinic-accent)" }}>{b.icon}</span>
                {b.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 lg:col-span-5 lg:mt-0">
          <div
            className="relative overflow-hidden rounded-card shadow-2xl"
            style={{
              background: "color-mix(in srgb, var(--clinic-accent) 12%, white)",
              border: "1px solid color-mix(in srgb, var(--clinic-accent) 30%, transparent)",
            }}
          >
            <div className="p-8">
              <p
                className="text-xs font-semibold uppercase tracking-[0.22em]"
                style={{ color: "var(--clinic-primary)" }}
              >
                Treatment options
              </p>
              <ul className="mt-5 space-y-4">
                {[
                  {
                    name: "Invisalign",
                    desc: "Clear, removable aligners. Virtually invisible.",
                  },
                  {
                    name: "Clear Braces",
                    desc: "Ceramic brackets that blend with your smile.",
                  },
                  {
                    name: "Traditional Braces",
                    desc: "Proven, precise, and the most affordable option.",
                  },
                  {
                    name: "Retainers",
                    desc: "Keep results locked in after treatment.",
                  },
                ].map((t) => (
                  <li key={t.name} className="flex gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: "var(--clinic-primary)",
                        color: "var(--clinic-primary-fg)",
                      }}
                    >
                      ✓
                    </span>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--clinic-primary)" }}
                      >
                        {t.name}
                      </p>
                      <p className="text-xs text-ink-muted">{t.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="border-t px-8 py-5 text-sm font-medium"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--clinic-primary) 15%, transparent)",
                color: "var(--clinic-primary)",
              }}
            >
              Most insurance accepted · Payment plans available
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
