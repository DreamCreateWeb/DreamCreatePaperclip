import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";

import { ContactEmailForm } from "./contact-email-form";

export const dynamic = "force-dynamic";

export default async function OwnerSettingsPage() {
  const owner = await getCurrentClinicOwner();
  if (!owner) return null;

  return (
    <div className="space-y-12">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Settings
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] text-ink">
          Account
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-muted">
          Your sign-in email and the contact address shown on your public site.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div>
          <h2 className="font-display text-xl text-ink">Sign-in email</h2>
          <p className="mt-2 text-sm text-ink-muted">
            The email you use to receive magic-link sign-in links. Changing it
            requires an admin — please reach out to{" "}
            <a
              className="text-accent underline underline-offset-4"
              href="mailto:hello@dreamcreate.dental"
            >
              hello@dreamcreate.dental
            </a>
            .
          </p>
        </div>
        <div className="rounded-card border border-rule bg-white p-6">
          <p className={"text-xs font-medium uppercase tracking-[0.16em] text-ink-muted"}>
            Current
          </p>
          <p className="mt-2 font-display text-lg text-ink">
            {owner.user.email}
          </p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div>
          <h2 className="font-display text-xl text-ink">Public contact email</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Shown to patients on your contact page and used as the reply-to
            address when patients submit your contact form.
          </p>
        </div>
        <ContactEmailForm initialEmail={owner.clinic.contactEmail} />
      </section>

      <section className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div>
          <h2 className="font-display text-xl text-ink">Sign out everywhere</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Revokes every active session on every device. Use this if you
            suspect someone else has access to your account.
          </p>
        </div>
        <div className="rounded-card border border-rule bg-white p-6">
          <form action="/api/owner/account/sign-out-all" method="post">
            <button
              type="submit"
              className="rounded-pill bg-red-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Sign out everywhere
            </button>
            <p className="mt-3 text-xs text-ink-muted">
              You&rsquo;ll be sent back to the sign-in page.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
