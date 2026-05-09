type SearchParams = Promise<{ error?: string; signed_out?: string }>;

const ERROR_COPY: Record<string, string> = {
  invalid: "That sign-in link is invalid or has expired. Try requesting a new one.",
};

const NOTICE_COPY: Record<string, string> = {
  all: "Signed out of every device. Request a new link below to sign back in.",
};

export default async function OwnerLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const error = params.error ? ERROR_COPY[params.error] : null;
  const notice = params.signed_out ? NOTICE_COPY[params.signed_out] : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
        Dream Create · Clinic portal
      </p>
      <h1 className="mt-4 font-display text-4xl leading-[1.05] text-ink">
        Sign in.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        Enter the email on file for your clinic. We&rsquo;ll send you a
        one-time sign-in link.
      </p>

      {error ? (
        <div className="mt-6 rounded-card border border-rule bg-canvas px-4 py-3 text-sm text-ink">
          {error}
        </div>
      ) : notice ? (
        <div className="mt-6 rounded-card border border-rule bg-canvas px-4 py-3 text-sm text-ink">
          {notice}
        </div>
      ) : null}

      <form
        action="/api/owner/auth/request"
        method="post"
        className="mt-8 flex flex-col gap-3"
      >
        <label
          htmlFor="email"
          className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@yourclinic.com"
          className="rounded-card border border-rule bg-white px-4 py-3 text-base text-ink shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
        <button
          type="submit"
          className="mt-2 rounded-pill bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-ink"
        >
          Email me a link
        </button>
      </form>

      <p className="mt-10 text-xs text-ink-muted">
        Don&rsquo;t have a clinic yet?{" "}
        <a className="text-accent underline underline-offset-4" href="/onboard">
          Onboard your clinic
        </a>
        .
      </p>
    </main>
  );
}
