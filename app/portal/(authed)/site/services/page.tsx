import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";

import { ServicesEditor } from "./services-editor";

export const dynamic = "force-dynamic";

export default async function OwnerSiteServicesPage() {
  const owner = await getCurrentClinicOwner();
  if (!owner) return null;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-xl text-ink">Services</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          What you offer. Each service appears on your homepage and on the
          dedicated <code>/services</code> page. Add at least one; up to twenty.
        </p>
      </header>
      <ServicesEditor initial={owner.clinic.services ?? []} />
    </div>
  );
}
