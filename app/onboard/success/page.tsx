import Link from "next/link";
import { eq } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { clinics } from "@/src/db/schema";
import { getStripe } from "@/src/lib/stripe/client";

type SearchParams = Promise<{ session_id?: string }>;

export const metadata = {
  title: "Payment confirmed · Dream Create",
  description: "Your subscription is active. We'll be in touch shortly.",
};

export const dynamic = "force-dynamic";

export default async function OnboardSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return <ErrorView message="Missing session. Please contact support." />;
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription"],
    });

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return (
        <ErrorView message="Payment not yet confirmed. If you completed payment, please wait a moment and refresh." />
      );
    }

    const clinicId = session.metadata?.clinicId;
    if (clinicId) {
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as { id: string } | null)?.id ?? null;

      await getDb()
        .update(clinics)
        .set({
          stripeSubscriptionId: subscriptionId ?? undefined,
          status: "pending_payment",
          updatedAt: new Date(),
        })
        .where(eq(clinics.id, clinicId));
    }

    const slug = session.metadata?.slug ?? null;

    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-24">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          Payment confirmed
        </p>
        <h1 className="mt-4 font-display text-5xl leading-[1.05] text-ink">
          You&rsquo;re in the queue.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-muted">
          Your subscription is active. Our team will have your clinic website
          drafted within 24 hours. We&rsquo;ll email you when it&rsquo;s ready
          to review.
        </p>

        {slug && (
          <div className="mt-10 rounded-[var(--radius-card)] border border-rule bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
              Your future home
            </p>
            <p className="mt-2 font-mono text-sm text-ink">
              dreamcreate.web/<span className="text-accent">{slug}</span>
            </p>
          </div>
        )}

        <div className="mt-10">
          <Link
            href="/"
            className="rounded-pill border border-rule bg-white px-6 py-3 text-center text-sm font-medium text-ink transition hover:border-ink/40"
          >
            Back to home
          </Link>
        </div>

        <p className="mt-6 text-xs text-ink-muted">
          Questions? Reach us at{" "}
          <a
            href="mailto:hello@dreamcreateweb.com"
            className="underline underline-offset-4"
          >
            hello@dreamcreateweb.com
          </a>
          .
        </p>
      </main>
    );
  } catch {
    return <ErrorView message="Could not verify payment. Please contact support." />;
  }
}

function ErrorView({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-600">
        Something went wrong
      </p>
      <h1 className="mt-4 font-display text-4xl leading-[1.1] text-ink">
        Payment issue
      </h1>
      <p className="mt-6 text-base leading-relaxed text-ink-muted">{message}</p>
      <div className="mt-10 flex gap-3">
        <Link
          href="/onboard"
          className="rounded-pill bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-accent/90"
        >
          Try again
        </Link>
        <Link
          href="/"
          className="rounded-pill border border-rule bg-white px-6 py-3 text-sm font-medium text-ink transition hover:border-ink/40"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
