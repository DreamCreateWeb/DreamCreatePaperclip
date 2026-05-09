import { listContactMessages } from "@/src/lib/clinic/contact-messages";
import { telHref } from "@/src/lib/clinic/format";
import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function OwnerMessagesPage() {
  const owner = await getCurrentClinicOwner();
  if (!owner) return null;

  const messages = await listContactMessages(owner.clinic.id, 200);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Patient messages
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] text-ink">
          Inbox
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          Submissions from your site&rsquo;s contact form.
        </p>
      </header>

      {messages.length === 0 ? (
        <div className="rounded-card border border-rule bg-white p-10 text-center">
          <p className="text-sm font-medium text-ink">No messages yet</p>
          <p className="mt-2 text-sm text-ink-muted">
            When patients submit your contact form, they&rsquo;ll show up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => {
            const tel = telHref(m.phone);
            return (
              <li
                key={m.id}
                className="rounded-card border border-rule bg-white p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{m.name}</p>
                    <p className="text-xs text-ink-muted">
                      <a
                        className="hover:underline"
                        href={`mailto:${m.email}`}
                      >
                        {m.email}
                      </a>
                      {tel ? (
                        <>
                          {" · "}
                          <a className="hover:underline" href={tel}>
                            {m.phone}
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {dateFormatter.format(new Date(m.createdAt))}
                  </p>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {m.message}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
