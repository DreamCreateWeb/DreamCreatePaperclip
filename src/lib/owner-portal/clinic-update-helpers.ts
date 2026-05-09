import { revalidatePath } from "next/cache";

export function revalidateClinicSite(slug: string): void {
  revalidatePath(`/sites/${slug}`);
  revalidatePath(`/sites/${slug}/contact`);
  revalidatePath(`/sites/${slug}/services`);
  revalidatePath(`/sites/${slug}/team`);
}
