import type { Clinic } from "@/src/db/schema";
import {
  dayLabel,
  formatAddressLines,
  formatHourRange,
  orderedHours,
  telHref,
} from "@/src/lib/clinic/format";

type Props = {
  clinic: Clinic;
  basePath: string;
};

export function HoursLocationCard({ clinic, basePath }: Props) {
  const addressLines = formatAddressLines(clinic.address);
  const phone = telHref(clinic.contactPhone);
  const hours = orderedHours(clinic.hours);
  return (
    <section aria-label="Location and hours" className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-rule bg-white p-8">
          <p
            className="text-xs font-medium uppercase tracking-[0.22em]"
            style={{ color: "var(--clinic-primary)" }}
          >
            Visit us
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink">
            Easy to find. Easy to park.
          </h2>
          <address className="mt-5 not-italic text-base leading-relaxed text-ink">
            {addressLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </address>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
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
          <div className="mt-6">
            <a
              href={`${basePath}/contact`}
              className="inline-flex h-10 items-center rounded-pill px-5 text-sm font-medium shadow-sm transition-opacity hover:opacity-90"
              style={{
                background: "var(--clinic-primary)",
                color: "var(--clinic-primary-fg)",
              }}
            >
              Get directions
            </a>
          </div>
        </div>

        <div className="rounded-card border border-rule bg-white p-8">
          <p
            className="text-xs font-medium uppercase tracking-[0.22em]"
            style={{ color: "var(--clinic-primary)" }}
          >
            Hours
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink">When we&rsquo;re open.</h2>
          {hours.length > 0 ? (
            <ul className="mt-6 divide-y divide-rule/70">
              {hours.map((h) => (
                <li
                  key={h.day}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="text-ink">{dayLabel(h.day)}</span>
                  <span className={h.closed ? "text-ink-muted" : "text-ink"}>
                    {formatHourRange(h)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">
              Hours by appointment — call to schedule.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
