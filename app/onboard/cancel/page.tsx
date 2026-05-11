import Link from "next/link";

type SearchParams = Promise<{ clinic_id?: string }>;

export const metadata = {
  title: "Payment cancelled · Dream Create",
  description: "Your payment was cancelled. You can try again whenever you're ready.",
};

export default async function OnboardCancelPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // clinic_id is available if we need to resume checkout later; passed via cancel_url
  const { clinic_id } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
        Payment cancelled
      </p>
      <h1 className="mt-4 font-display text-4xl leading-[1.1] text-ink">
        No worries — your spot is saved.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-muted">
        Your clinic details are saved. You can complete payment any time to
        lock in your launch.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        {clinic_id ? (
          <Link
            href={`/onboard/thanks?clinicId=${encodeURIComponent(clinic_id)}`}
            className="rounded-pill bg-accent px-6 py-3 text-center text-sm font-medium text-white transition hover:bg-accent/90"
          >
            Resume payment →
          </Link>
        ) : (
          <Link
            href="/onboard"
            className="rounded-pill bg-accent px-6 py-3 text-center text-sm font-medium text-white transition hover:bg-accent/90"
          >
            Start over
          </Link>
        )}
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
}
