"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SITE_NAV: ReadonlyArray<{ href: Route; label: string; match: string }> = [
  { href: "/portal/site", label: "Basics", match: "/portal/site" },
  {
    href: "/portal/site/services",
    label: "Services",
    match: "/portal/site/services",
  },
  { href: "/portal/site/team", label: "Team", match: "/portal/site/team" },
  { href: "/portal/site/brand", label: "Brand", match: "/portal/site/brand" },
  {
    href: "/portal/site/before-after",
    label: "Before & After",
    match: "/portal/site/before-after",
  },
];

export function SiteSubNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-rule">
      {SITE_NAV.map((item) => {
        const active =
          item.match === "/portal/site"
            ? pathname === "/portal/site"
            : pathname === item.match || pathname.startsWith(`${item.match}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "border-b-2 px-4 py-2 text-sm transition " +
              (active
                ? "border-accent text-ink"
                : "border-transparent text-ink-muted hover:border-rule hover:text-ink")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
