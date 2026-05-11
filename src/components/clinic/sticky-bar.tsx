import Link from "next/link";
import type { Route } from "next";
import type { Clinic } from "@/src/db/schema";
import { telHref } from "@/src/lib/clinic/format";

type Props = {
  clinic: Clinic;
  basePath: string;
};

// Visible only on mobile (md:hidden). Fixed to the bottom of the viewport.
export function StickyCtaBar({ clinic, basePath }: Props) {
  const phone = telHref(clinic.contactPhone);
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex gap-0 border-t border-rule bg-white shadow-[0_-2px_12px_rgba(0,0,0,.08)] md:hidden"
      role="complementary"
      aria-label="Quick actions"
    >
      <Link
        href={`${basePath}/book` as unknown as Route}
        className="flex flex-1 items-center justify-center py-4 text-sm font-semibold text-white"
        style={{ background: "var(--clinic-primary)" }}
      >
        Book Appointment
      </Link>
      {phone ? (
        <a
          href={phone}
          className="flex items-center justify-center px-5 py-4 text-sm font-semibold text-ink border-l border-rule"
          aria-label={`Call ${clinic.contactPhone}`}
        >
          Call
        </a>
      ) : null}
    </div>
  );
}
