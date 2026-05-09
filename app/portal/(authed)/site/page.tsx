import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";

import { SiteEditor } from "./site-editor";

export const dynamic = "force-dynamic";

export default async function OwnerSitePage() {
  const owner = await getCurrentClinicOwner();
  if (!owner) return null;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Site content
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] text-ink">
          Edit your site
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-muted">
          Update the basics that show up on your public site. Services, team
          members, and brand colors will land in a follow-up release.
        </p>
      </header>
      <SiteEditor clinic={owner.clinic} />
    </div>
  );
}
