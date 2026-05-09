import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";

import { SiteEditor } from "./site-editor";

export const dynamic = "force-dynamic";

export default async function OwnerSitePage() {
  const owner = await getCurrentClinicOwner();
  if (!owner) return null;

  return <SiteEditor clinic={owner.clinic} />;
}
