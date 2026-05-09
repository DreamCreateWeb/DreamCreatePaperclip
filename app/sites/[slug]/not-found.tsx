import Link from "next/link";

export default function ClinicNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
        404 · Clinic not found
      </p>
      <h1 className="mt-4 font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
        We couldn&rsquo;t find that clinic.
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
        The link may be old or the site may have moved. If you&rsquo;re a
        clinic owner looking to onboard, start at{" "}
        <Link
          href="/onboard"
          className="text-accent underline underline-offset-4"
        >
          /onboard
        </Link>
        .
      </p>
    </main>
  );
}
