import { notFound } from "next/navigation";

import { ClinicFooter } from "@/src/components/clinic/footer";
import { brandStyle, resolveBrand } from "@/src/lib/clinic/brand";
import { getClinicBySlug } from "@/src/lib/clinic/get-clinic";

export default async function ClinicSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();

  const brand = resolveBrand(clinic.brand);
  const basePath = `/sites/${clinic.slug}`;

  return (
    <div style={brandStyle(brand)} className="min-h-dvh bg-canvas text-ink">
      <a
        href="#clinic-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-card focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-ink focus:shadow"
      >
        Skip to content
      </a>
      {/* tabIndex={-1} allows the skip link to programmatically focus this div */}
      <div id="clinic-main" tabIndex={-1}>{children}</div>
      <ClinicFooter clinic={clinic} basePath={basePath} />
    </div>
  );
}
