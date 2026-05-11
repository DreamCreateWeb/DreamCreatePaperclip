import Image from "next/image";

export type InsuranceProvider = {
  name: string;
  logoUrl?: string;
};

type Props = {
  providers: InsuranceProvider[];
  heading?: string;
};

export function InsuranceCarousel({ providers, heading }: Props) {
  if (providers.length === 0) return null;

  return (
    <section
      className="border-y border-rule bg-surface py-14"
      aria-label={heading ?? "Insurance providers"}
    >
      <div className="mx-auto max-w-6xl px-6">
        {heading ? (
          <p className="mb-8 text-center text-xs font-medium uppercase tracking-[0.22em] text-ink-muted">
            {heading}
          </p>
        ) : null}

        {/* Scrollable row */}
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {providers.map((p) => (
            <li key={p.name}>
              {p.logoUrl ? (
                <Image
                  src={p.logoUrl}
                  alt={p.name}
                  width={80}
                  height={32}
                  className="h-8 w-auto grayscale opacity-70 transition hover:grayscale-0 hover:opacity-100"
                  sizes="80px"
                />
              ) : (
                <span className="rounded-pill border border-rule bg-white px-4 py-2 text-sm font-medium text-ink-muted">
                  {p.name}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
