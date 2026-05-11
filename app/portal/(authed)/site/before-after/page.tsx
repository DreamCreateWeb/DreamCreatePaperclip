import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";

import { BeforeAfterEditor } from "./before-after-editor";

export const dynamic = "force-dynamic";

export default async function OwnerSiteBeforeAfterPage() {
  const owner = await getCurrentClinicOwner();
  if (!owner) return null;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-xl text-ink">Before &amp; After</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Showcase cosmetic and restorative results. Each pair shows a before
          and after photo with a toggle for visitors to compare. Up to twenty
          pairs.
        </p>
      </header>
      <BeforeAfterEditor initial={owner.clinic.beforeAfterPairs ?? []} />
    </div>
  );
}
