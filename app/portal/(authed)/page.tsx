import type { Route } from "next";
import Link from "next/link";

import { countContactMessages } from "@/src/lib/clinic/contact-messages";
import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-amber-100 text-amber-900" },
  pending_payment: {
    label: "Pending payment",
    tone: "bg-amber-100 text-amber-900",
  },
  provisioning: { label: "Provisioning", tone: "bg-sky-100 text-sky-900" },
  live: { label: "Live", tone: "bg-emerald-100 text-emerald-900" },
  paused: { label: "Paused", tone: "bg-stone-200 text-stone-800" },
  cancelled: { label: "Cancelled", tone: "bg-stone-200 text-stone-800" },
};

export default async function OwnerDashboardPage() {
  const owner = await getCurrentClinicOwner();
  if (!owner) return null; // layout will redirect

  const { clinic } = owner;
  const status = STATUS_COPY[clinic.status] ?? {
    label: clinic.status,
    tone: "bg-stone-200 text-stone-800",
  };
  const messageCount = await countContactMessages(clinic.id);
  const liveUrl =
    clinic.customDomain ??
    clinic.vercelDeploymentUrl ??
    `/sites/${clinic.slug}`;

  return (
    <div className="space-y-12">
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Overview
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] text-ink">
            {clinic.name}
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            <span
              className={`inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${status.tone}`}
            >
              {status.label}
            </span>
            <span className="ml-3">
              <a
                href={liveUrl}
                className="text-accent underline underline-offset-4"
                target={liveUrl.startsWith("http") ? "_blank" : undefined}
                rel={liveUrl.startsWith("http") ? "noreferrer" : undefined}
              >
                View public site
              </a>
            </span>
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStat
          label="Contact messages"
          value={String(messageCount)}
          href="/portal/messages"
          cta="View inbox"
        />
        <DashboardStat
          label="Upcoming bookings"
          value="—"
          hint="Available once booking is wired up."
        />
        <DashboardStat
          label="New reviews"
          value="—"
          hint="Reviews ingest coming soon."
        />
        <DashboardStat
          label="Pending intake forms"
          value="—"
          hint="Patient intake forms coming soon."
        />
      </section>

      <section>
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Manage your site
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DashboardLink
            href="/portal/site"
            title="Basics"
            description="Hours, address, phone, social links."
          />
          <DashboardLink
            href="/portal/site/services"
            title="Services"
            description="What you offer, in priority order."
          />
          <DashboardLink
            href="/portal/site/team"
            title="Team"
            description="Doctors and staff with photos and bios."
          />
          <DashboardLink
            href="/portal/site/brand"
            title="Brand"
            description="Colors and logo with live preview."
          />
          <DashboardLink
            href="/portal/messages"
            title="Patient messages"
            description="Submissions from your contact form."
          />
          <DashboardLink
            href="/portal/settings"
            title="Account settings"
            description="Contact email and session controls."
          />
        </div>
      </section>
    </div>
  );
}

function DashboardLink({
  href,
  title,
  description,
}: {
  href: Route;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-card border border-rule bg-white p-6 transition hover:border-ink"
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink-muted">{description}</p>
      <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-accent group-hover:underline">
        Open →
      </p>
    </Link>
  );
}

function DashboardStat({
  label,
  value,
  hint,
  href,
  cta,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: Route;
  cta?: string;
}) {
  return (
    <div className="rounded-card border border-rule bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </p>
      <p className="mt-3 font-display text-3xl text-ink">{value}</p>
      {hint ? (
        <p className="mt-2 text-xs text-ink-muted">{hint}</p>
      ) : href && cta ? (
        <Link
          href={href}
          className="mt-2 inline-block text-xs font-medium uppercase tracking-[0.16em] text-accent underline-offset-4 hover:underline"
        >
          {cta}
        </Link>
      ) : null}
    </div>
  );
}
