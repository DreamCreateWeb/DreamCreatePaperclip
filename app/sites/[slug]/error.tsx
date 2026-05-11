"use client";

export default function ClinicError({
  _error,
  reset,
}: {
  _error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
        500 · Something went wrong
      </p>
      <h1 className="mt-4 font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
        An error occurred.
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
        Something unexpected happened. Please try again or call us directly for
        assistance.
      </p>
      <button
        onClick={reset}
        className="mt-8 inline-flex items-center justify-center rounded-lg border border-accent bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      >
        Try again
      </button>
    </main>
  );
}
