import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";

import { BrandEditor } from "./brand-editor";

export const dynamic = "force-dynamic";

export default async function OwnerSiteBrandPage() {
  const owner = await getCurrentClinicOwner();
  if (!owner) return null;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-xl text-ink">Brand</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Colors and logo for your public site. Pick a primary that reads well
          on white and an accent that complements it. Live preview updates as
          you tweak.
        </p>
      </header>
      <BrandEditor clinicName={owner.clinic.name} initial={owner.clinic.brand} />
    </div>
  );
}
