import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/bookings", label: "Bookings" },
  { href: "/portal/messages", label: "Messages" },
  { href: "/portal/site", label: "Site content" },
  { href: "/portal/settings", label: "Settings" },
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

export default async function PortalAuthedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const owner = await getCurrentClinicOwner();
  if (!owner) redirect("/portal/login");

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="border-b border-rule bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link
              href="/portal"
              className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted hover:text-ink"
            >
              Dream Create · {owner.clinic.name}
            </Link>
            <nav className="hidden items-center gap-4 md:flex">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-ink-muted hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-ink-muted md:inline">
              {owner.user.email}
            </span>
            <form action="/api/owner/auth/logout" method="post">
              <button
                type="submit"
                className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted underline underline-offset-4 hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-6 pb-3 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-ink-muted hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>
    </div>
  );
}
