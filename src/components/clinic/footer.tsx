import Link from "next/link";
import type { Route } from "next";
import type { Clinic } from "@/src/db/schema";
import {
  formatAddressLines,
  formatHourRange,
  orderedHours,
  telHref,
  dayLabel,
} from "@/src/lib/clinic/format";

type Props = {
  clinic: Clinic;
  basePath: string;
};

export function ClinicFooter({ clinic, basePath }: Props) {
  const addressLines = formatAddressLines(clinic.address);
  const phone = telHref(clinic.contactPhone);
  const hours = orderedHours(clinic.hours);
  const social: Array<{ label: string; href: string }> = [];
  if (clinic.social?.facebook)
    social.push({ label: "Facebook", href: clinic.social.facebook });
  if (clinic.social?.instagram)
    social.push({ label: "Instagram", href: clinic.social.instagram });
  if (clinic.social?.google)
    social.push({ label: "Google", href: clinic.social.google });
  if (clinic.social?.website)
    social.push({ label: "Website", href: clinic.social.website });

  return (
    <footer className="mt-24 border-t border-rule bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl text-ink">{clinic.name}</p>
          <p className="mt-3 text-sm text-ink-muted">
            Modern dentistry, made personal.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
            Visit
          </p>
          <address className="mt-3 not-italic text-sm leading-relaxed text-ink">
            {addressLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </address>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
            Contact
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-ink">
            {phone ? (
              <li>
                <a className="hover:underline" href={phone}>
                  {clinic.contactPhone}
                </a>
              </li>
            ) : null}
            <li>
              <a
                className="hover:underline"
                href={`mailto:${clinic.contactEmail}`}
              >
                {clinic.contactEmail}
              </a>
            </li>
            <li className="pt-2">
              <Link
                href={`${basePath}/contact` as unknown as Route}
                className="text-ink-muted hover:text-ink"
              >
                Send a message →
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
            Hours
          </p>
          {hours.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-ink">
              {hours.map((h) => (
                <li key={h.day} className="flex justify-between gap-4">
                  <span>{dayLabel(h.day)}</span>
                  <span className="text-ink-muted">{formatHourRange(h)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">Hours by appointment.</p>
          )}
        </div>
      </div>

      <div className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-6 text-xs text-ink-muted sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {clinic.name}. All rights reserved.
          </p>
          {social.length > 0 ? (
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {social.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-ink"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
