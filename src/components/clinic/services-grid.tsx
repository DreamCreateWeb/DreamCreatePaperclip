import type { ClinicService } from "@/src/db/schema";

type Props = {
  services: ClinicService[];
  heading?: string;
  intro?: string;
};

export function ServicesGrid({ services, heading, intro }: Props) {
  if (services.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      {heading ? (
        <header className="mb-10 max-w-2xl">
          <p
            className="text-xs font-medium uppercase tracking-[0.22em]"
            style={{ color: "var(--clinic-primary)" }}
          >
            Services
          </p>
          <h2 className="mt-3 font-display text-4xl text-ink sm:text-5xl">
            {heading}
          </h2>
          {intro ? (
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">
              {intro}
            </p>
          ) : null}
        </header>
      ) : null}

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <li
            key={service.name}
            className="group rounded-card border border-rule bg-white p-6 transition-colors hover:border-ink/30"
          >
            <p
              aria-hidden
              className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
              style={{
                background: "var(--clinic-primary-soft)",
                color: "var(--clinic-primary)",
              }}
            >
              {service.name.slice(0, 1).toUpperCase()}
            </p>
            <p className="font-display text-xl leading-tight text-ink">
              {service.name}
            </p>
            {service.description ? (
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {service.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
