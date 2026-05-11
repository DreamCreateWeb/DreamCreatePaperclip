import Image from "next/image";
import type { ClinicTeamMember } from "@/src/db/schema";

type Props = {
  team: ClinicTeamMember[];
  heading?: string;
  intro?: string;
};

export function TeamGrid({ team, heading, intro }: Props) {
  if (team.length === 0) return null;
  return (
    <section
      className="border-y border-rule"
      style={{ background: "var(--clinic-primary-soft)" }}
    >
      <div className="mx-auto max-w-6xl px-6 py-20">
        {heading ? (
          <header className="mb-10 max-w-2xl">
            <p
              className="text-xs font-medium uppercase tracking-[0.22em]"
              style={{ color: "var(--clinic-primary)" }}
            >
              Our team
            </p>
            <h2 className="mt-3 font-display text-4xl text-ink sm:text-5xl">
              {heading}
            </h2>
            {intro ? (
              <p className="mt-4 text-lg leading-relaxed text-ink-muted">
                {intro}
              </p>
            ) : null}
          </header>
        ) : null}

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <li
              key={`${member.name}-${member.role}`}
              className="rounded-card border border-rule bg-white p-6"
            >
              {member.photoUrl ? (
                <Image
                  src={member.photoUrl}
                  alt=""
                  width={80}
                  height={80}
                  className="mb-4 h-20 w-20 rounded-full object-cover"
                  sizes="80px"
                />
              ) : (
                <div
                  aria-hidden
                  className="mb-4 flex h-20 w-20 items-center justify-center rounded-full font-display text-2xl"
                  style={{
                    background: "var(--clinic-primary-soft)",
                    color: "var(--clinic-primary)",
                  }}
                >
                  {member.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("")}
                </div>
              )}
              <p className="font-display text-xl leading-tight text-ink">
                {member.name}
              </p>
              <p
                className="mt-1 text-sm font-medium"
                style={{ color: "var(--clinic-primary)" }}
              >
                {member.role}
              </p>
              {member.bio ? (
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {member.bio}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
