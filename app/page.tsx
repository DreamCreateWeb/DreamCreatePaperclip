export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
        Dream Create · Platform
      </p>
      <h1 className="mt-4 font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
        The website factory for Arkansas dentistry.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
        This is the admin and provisioning console. Public clinic onboarding
        lives at{" "}
        <a className="text-accent underline underline-offset-4" href="/onboard">
          /onboard
        </a>
        .
      </p>
      <p className="mt-12 text-sm text-ink-muted">
        Sign-in is gated.{" "}
        <a className="text-accent underline underline-offset-4" href="/login">
          Operator sign-in
        </a>
        . If you don&rsquo;t have access, request it from the CEO.
      </p>
    </main>
  );
}
