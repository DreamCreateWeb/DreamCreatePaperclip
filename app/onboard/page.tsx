export const metadata = {
  title: "Onboard your clinic · Dream Create",
  description:
    "Tell us about your dental practice and we will build, host, and maintain your website for $200/month.",
};

export default function OnboardPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
        Get online in days, not months
      </p>
      <h1 className="mt-4 font-display text-5xl leading-[1.05] text-ink">
        Bring your clinic to the web.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-muted">
        Share a few details about your practice and we will design, build, and
        host a polished website tailored to your brand. Flat $200 per month —
        no setup fees, no surprises.
      </p>
      <div className="mt-10 rounded-[var(--radius-card)] border border-rule bg-white p-8">
        <p className="text-sm font-medium text-ink">Form coming soon</p>
        <p className="mt-2 text-sm text-ink-muted">
          The onboarding intake is being assembled. Reach out at{" "}
          <a
            className="text-accent underline underline-offset-4"
            href="mailto:hello@dreamcreate.web"
          >
            hello@dreamcreate.web
          </a>{" "}
          and we will get you started today.
        </p>
      </div>
    </main>
  );
}
