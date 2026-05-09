import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";

import { TeamEditor } from "./team-editor";

export const dynamic = "force-dynamic";

export default async function OwnerSiteTeamPage() {
  const owner = await getCurrentClinicOwner();
  if (!owner) return null;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-xl text-ink">Team</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Doctors and staff that show up on your team page. Add at least one;
          up to forty.
        </p>
      </header>
      <TeamEditor initial={owner.clinic.team ?? []} />
    </div>
  );
}
