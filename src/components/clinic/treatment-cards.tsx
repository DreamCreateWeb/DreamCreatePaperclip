import type { ClinicService } from "@/src/db/schema";

type TreatmentCard = {
  name: string;
  description: string;
  tag?: string;
};

const DEFAULT_TREATMENTS: TreatmentCard[] = [
  {
    name: "Invisalign",
    description:
      "Custom clear aligners that straighten teeth discreetly — removable for eating, sports, and photos.",
    tag: "Most popular",
  },
  {
    name: "Traditional Braces",
    description:
      "Metal brackets and wires offer the most precise control for complex corrections. Reliable and affordable.",
    tag: "Most affordable",
  },
  {
    name: "Clear Braces",
    description:
      "Ceramic brackets that match your tooth color for a subtler look, with the same correction power as metal.",
  },
  {
    name: "Retainers",
    description:
      "Custom-fitted retainers keep your smile in place after treatment — fixed or removable options available.",
  },
  {
    name: "Early Orthodontics",
    description:
      "Phase-1 treatment for children ages 7–10 that guides jaw development before all permanent teeth arrive.",
  },
  {
    name: "Teen Packages",
    description:
      "Flexible plans designed around school schedules, sports seasons, and social confidence.",
  },
];

function buildCards(services: ClinicService[]): TreatmentCard[] {
  if (services.length > 0) {
    return services.map((s) => ({ name: s.name, description: s.description ?? "" }));
  }
  return DEFAULT_TREATMENTS;
}

type Props = {
  services: ClinicService[];
  heading?: string;
  intro?: string;
};

export function TreatmentCards({
  services,
  heading = "Orthodontic treatments",
  intro = "Every smile is different. We offer options that fit your teeth, your timeline, and your budget.",
}: Props) {
  const cards = buildCards(services);

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <header className="mb-10 max-w-2xl">
        <p
          className="text-xs font-medium uppercase tracking-[0.22em]"
          style={{ color: "var(--clinic-primary)" }}
        >
          Treatments
        </p>
        <h2 className="mt-3 font-display text-4xl text-ink sm:text-5xl">
          {heading}
        </h2>
        {intro ? (
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">{intro}</p>
        ) : null}
      </header>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.slice(0, 6).map((card) => (
          <li
            key={card.name}
            className="relative flex flex-col rounded-card border border-rule bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            {card.tag ? (
              <span
                className="mb-3 inline-flex w-max rounded-pill px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                style={{
                  background: "var(--clinic-primary-soft)",
                  color: "var(--clinic-primary)",
                }}
              >
                {card.tag}
              </span>
            ) : null}
            <h3 className="font-display text-xl text-ink">{card.name}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
              {card.description}
            </p>
            <div
              className="mt-5 h-0.5 w-10 rounded-full"
              style={{ background: "var(--clinic-primary)" }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
