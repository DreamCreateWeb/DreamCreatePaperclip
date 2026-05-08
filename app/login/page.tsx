type SearchParams = Promise<{ error?: string; next?: string }>;

const ERROR_COPY: Record<string, string> = {
  invalid: "That sign-in link is invalid or has expired. Try requesting a new one.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const error = params.error ? ERROR_COPY[params.error] : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
        Dream Create · Admin
      </p>
      <h1 className="mt-4 font-display text-4xl leading-[1.05] text-ink">
        Sign in.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        Enter your work email. We&rsquo;ll send a one-time sign-in link if
        you&rsquo;re on the operator allowlist.
      </p>

      {error ? (
        <div className="mt-6 rounded-card border border-rule bg-canvas px-4 py-3 text-sm text-ink">
          {error}
        </div>
      ) : null}

      <form
        action="/api/admin/auth/request"
        method="post"
        className="mt-8 flex flex-col gap-3"
      >
        {params.next ? (
          <input type="hidden" name="next" value={params.next} />
        ) : null}
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
          placeholder="you@dreamcreate.web"
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
        Not an operator?{" "}
        <a className="text-accent underline underline-offset-4" href="/onboard">
          Onboard your clinic
        </a>{" "}
        instead.
      </p>
    </main>
  );
}
