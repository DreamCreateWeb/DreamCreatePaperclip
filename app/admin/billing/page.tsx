import { redirect } from "next/navigation";
import { inArray } from "drizzle-orm";
import type Stripe from "stripe";

import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { getDb, schema } from "@/src/db/client";
import { getStripe } from "@/src/lib/stripe/client";

export const dynamic = "force-dynamic";

type SubscriptionRow = {
  clinicName: string;
  plan: string;
  mrr: number;
  status: string;
  nextBillingDate: Date | null;
  cancelDate: Date | null;
};

const STATUS_ORDER: Record<string, number> = {
  past_due: 0,
  active: 1,
  canceled: 2,
};

function monthlyAmount(
  unitAmount: number,
  interval: Stripe.Price.Recurring.Interval,
  intervalCount: number,
): number {
  if (interval === "month") return unitAmount / 100 / intervalCount;
  if (interval === "year") return unitAmount / 100 / (intervalCount * 12);
  if (interval === "week") return (unitAmount / 100 / intervalCount) * 4.33;
  return unitAmount / 100;
}

function planLabel(
  unitAmount: number,
  interval: Stripe.Price.Recurring.Interval,
): string {
  const dollars = (unitAmount / 100).toFixed(0);
  return `$${dollars}/${interval === "month" ? "mo" : interval}`;
}

export default async function AdminBillingPage() {
  const admin = await getCurrentAdminUser();
  if (!admin) redirect("/login");

  const stripe = getStripe();
  const db = getDb();

  const subscriptionList = await stripe.subscriptions.list({
    limit: 100,
    status: "all",
  });

  const subs = subscriptionList.data;

  const subIds = subs.map((s) => s.id);
  const clinicRows =
    subIds.length > 0
      ? await db
          .select({
            name: schema.clinics.name,
            stripeSubscriptionId: schema.clinics.stripeSubscriptionId,
          })
          .from(schema.clinics)
          .where(inArray(schema.clinics.stripeSubscriptionId, subIds))
      : [];

  const clinicBySubId = new Map(
    clinicRows.map((c) => [c.stripeSubscriptionId, c.name]),
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const rows: SubscriptionRow[] = subs.map((sub) => {
    const item = sub.items.data[0];
    const price = item?.price;
    const recurring = price?.recurring;
    const ua = price?.unit_amount ?? 0;
    const interval = recurring?.interval ?? "month";
    const intervalCount = recurring?.interval_count ?? 1;
    const nextBillingTs = item?.current_period_end;
    return {
      clinicName: clinicBySubId.get(sub.id) ?? sub.id,
      plan: price ? planLabel(ua, interval) : "—",
      mrr: price ? monthlyAmount(ua, interval, intervalCount) : 0,
      status: sub.status,
      nextBillingDate: nextBillingTs != null ? new Date(nextBillingTs * 1000) : null,
      cancelDate:
        sub.canceled_at != null
          ? new Date(sub.canceled_at * 1000)
          : null,
    };
  });

  rows.sort((a, b) => {
    const oa = STATUS_ORDER[a.status] ?? 99;
    const ob = STATUS_ORDER[b.status] ?? 99;
    if (oa !== ob) return oa - ob;
    return a.clinicName.localeCompare(b.clinicName);
  });

  const activeCount = subs.filter((s) => s.status === "active").length;
  const pastDueCount = subs.filter((s) => s.status === "past_due").length;
  const cancelledThisMonth = subs.filter(
    (s) => s.canceled_at != null && s.canceled_at * 1000 >= monthStart,
  ).length;

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-16">
      <header className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Dream Create · Admin
        </p>
        <form action="/api/admin/auth/logout" method="post">
          <button
            type="submit"
            className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted underline underline-offset-4 hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-12">
        <h1 className="font-display text-4xl leading-[1.05] text-ink">
          Billing
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          Live Stripe subscription data. Refreshed on every page load.
        </p>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Active" value={activeCount} color="green" />
        <SummaryCard label="Past due" value={pastDueCount} color="amber" />
        <SummaryCard
          label="Cancelled this month"
          value={cancelledThisMonth}
          color="red"
        />
        <SummaryCard
          label="Churned this month"
          value={cancelledThisMonth}
          color="red"
        />
      </section>

      <section className="mt-10">
        {rows.length === 0 ? (
          <div className="rounded-card border border-rule bg-white p-10 text-center">
            <p className="text-sm font-medium text-ink">
              No subscriptions found
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              Subscriptions will appear here once clinics complete checkout.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-card border border-rule bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left">
                  {[
                    "Clinic",
                    "Plan",
                    "MRR",
                    "Status",
                    "Next billing",
                    "Cancel date",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-4 text-xs font-medium uppercase tracking-[0.16em] text-ink-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-rule last:border-0">
                    <td className="px-5 py-4 font-medium text-ink">
                      {row.clinicName}
                    </td>
                    <td className="px-5 py-4 text-ink-muted">{row.plan}</td>
                    <td className="px-5 py-4 text-ink">
                      ${row.mrr.toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-5 py-4 text-ink-muted">
                      {row.nextBillingDate
                        ? row.nextBillingDate.toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-ink-muted">
                      {row.cancelDate
                        ? row.cancelDate.toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "amber" | "red";
}) {
  const valueClass =
    color === "green"
      ? "text-green-600"
      : color === "amber"
        ? "text-amber-600"
        : "text-red-600";
  return (
    <div className="rounded-card border border-rule bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: "Active",
      className: "bg-green-100 text-green-800",
    },
    past_due: {
      label: "Past due",
      className: "bg-amber-100 text-amber-800",
    },
    canceled: {
      label: "Cancelled",
      className: "bg-red-100 text-red-800",
    },
    trialing: {
      label: "Trialing",
      className: "bg-blue-100 text-blue-800",
    },
    paused: {
      label: "Paused",
      className: "bg-gray-100 text-gray-700",
    },
  };
  const { label, className } = config[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
