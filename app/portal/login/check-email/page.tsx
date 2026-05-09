export default function OwnerCheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
        Dream Create · Clinic portal
      </p>
      <h1 className="mt-4 font-display text-4xl leading-[1.05] text-ink">
        Check your email.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        If that address matches a clinic we have on file, we&rsquo;ve sent a
        one-time sign-in link. It expires in 15 minutes.
      </p>
      <p className="mt-8 text-xs text-ink-muted">
        Didn&rsquo;t get anything?{" "}
        <a
          className="text-accent underline underline-offset-4"
          href="/portal/login"
        >
          Try again
        </a>
        .
      </p>
    </main>
  );
}
