import Link from "next/link";
import type { Route } from "next";
import type { Clinic } from "@/src/db/schema";
import { telHref } from "@/src/lib/clinic/format";

type Props = {
  clinic: Clinic;
  basePath: string;
  current?: "home" | "services" | "team" | "contact";
};

const NAV: Array<{ key: NonNullable<Props["current"]>; href: string; label: string }> = [
  { key: "home", href: "", label: "Home" },
  { key: "services", href: "/services", label: "Services" },
  { key: "team", href: "/team", label: "Team" },
  { key: "contact", href: "/contact", label: "Contact" },
];

export function ClinicHeader({ clinic, basePath, current = "home" }: Props) {
  const phone = telHref(clinic.contactPhone);
  return (
    <header className="sticky top-0 z-30 border-b border-rule/70 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link
          href={(basePath || "/") as unknown as Route}
          className="flex items-center gap-3 text-ink"
          aria-label={`${clinic.name} — home`}
        >
          {clinic.brand?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clinic.brand.logoUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
              style={{
                background: "var(--clinic-primary)",
                color: "var(--clinic-primary-fg)",
              }}
            >
              {clinic.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="font-display text-lg leading-none tracking-tight">
            {clinic.name}
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => {
            const href = (`${basePath}${item.href}` || "/") as unknown as Route;
            const active = item.key === current;
            return (
              <Link
                key={item.key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`text-sm transition-colors ${
                  active
                    ? "text-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {phone ? (
            <a
              href={phone}
              className="hidden text-sm text-ink-muted hover:text-ink sm:inline"
            >
              {clinic.contactPhone}
            </a>
          ) : null}
          <Link
            href={`${basePath}/book` as unknown as Route}
            className="inline-flex h-9 items-center rounded-pill px-4 text-sm font-medium shadow-sm transition-opacity hover:opacity-90"
            style={{
              background: "var(--clinic-primary)",
              color: "var(--clinic-primary-fg)",
            }}
          >
            Book a visit
          </Link>
        </div>
      </div>

      <nav
        aria-label="Primary mobile"
        className="flex gap-4 overflow-x-auto border-t border-rule/60 px-6 py-2 text-sm md:hidden"
      >
        {NAV.map((item) => {
          const href = (`${basePath}${item.href}` || "/") as unknown as Route;
          const active = item.key === current;
          return (
            <Link
              key={item.key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap ${
                active ? "text-ink" : "text-ink-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
