import { OnboardForm } from "./onboard-form";

export const metadata = {
  title: "Onboard your clinic · Dream Create",
  description:
    "Tell us about your dental practice and we'll build, host, and maintain your website for $200/month.",
};

export const dynamic = "force-dynamic";

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-16 sm:py-20">
      <header className="mb-14">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          Get online in days, not months
        </p>
        <h1 className="mt-4 font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
          Bring your clinic to the web.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Share a few details about your practice and we&rsquo;ll design,
          build, and host a polished website tailored to your brand. Flat $200
          per month — no setup fees, no surprises.
        </p>
        <ul className="mt-8 grid gap-3 text-sm text-ink-muted sm:grid-cols-3">
          <li className="rounded-card border border-rule bg-white px-4 py-3">
            <span className="block text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
              Step 1
            </span>
            <span className="mt-1 block text-ink">Tell us about you</span>
          </li>
          <li className="rounded-card border border-rule bg-white px-4 py-3">
            <span className="block text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
              Step 2
            </span>
            <span className="mt-1 block text-ink">We design + deploy</span>
          </li>
          <li className="rounded-card border border-rule bg-white px-4 py-3">
            <span className="block text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
              Step 3
            </span>
            <span className="mt-1 block text-ink">You go live</span>
          </li>
        </ul>
      </header>

      <OnboardForm resumeToken={token} />

      <footer className="mt-16 text-xs text-ink-muted">
        Already have an operator account?{" "}
        <a
          className="text-accent underline underline-offset-4"
          href="/login"
        >
          Sign in
        </a>
        .
      </footer>
    </main>
  );
}
