import Link from "next/link";

type SearchParams = Promise<{ slug?: string }>;

export const metadata = {
  title: "We've got it · Dream Create",
  description: "Your clinic submission is in. Continue to payment to lock in your launch.",
};

export const dynamic = "force-dynamic";

export default async function OnboardThanksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { slug } = await searchParams;
  const subdomainPreview = slug && slug !== "queued" ? slug : "your-clinic";

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
        Submission received
      </p>
      <h1 className="mt-4 font-display text-5xl leading-[1.05] text-ink">
        We&rsquo;ve got it.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-muted">
        Thanks for sharing your clinic details. Our team will review and follow
        up within one business day. To lock in your spot in the build queue,
        continue to payment.
      </p>

      <div className="mt-10 rounded-[var(--radius-card)] border border-rule bg-white p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Your future home
        </p>
        <p className="mt-2 font-mono text-sm text-ink">
          dreamcreate.web/<span className="text-accent">{subdomainPreview}</span>
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <span
          className="rounded-pill bg-accent px-6 py-3 text-center text-sm font-medium text-white shadow-sm opacity-90"
          aria-disabled="true"
        >
          Continue to payment (coming soon)
        </span>
        <Link
          href="/"
          className="rounded-pill border border-rule bg-white px-6 py-3 text-center text-sm font-medium text-ink transition hover:border-ink/40"
        >
          Back to home
        </Link>
      </div>

      <p className="mt-6 text-xs text-ink-muted">
        Payment isn&rsquo;t live yet — we&rsquo;ll email you a secure Stripe
        link as soon as your draft is reviewed.
      </p>
    </main>
  );
}
