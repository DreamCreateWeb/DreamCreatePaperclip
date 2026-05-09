import type { Metadata } from "next";
import type { Clinic } from "@/src/db/schema";

function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}

export function clinicCanonical(slug: string, path = ""): string {
  const origin = siteOrigin();
  const tail = path ? `/${path.replace(/^\//, "")}` : "";
  return `${origin}/sites/${slug}${tail}`;
}

export type BuildMetadataInput = {
  clinic: Clinic;
  pageTitle?: string;
  description: string;
  pathSuffix?: string;
};

export function buildClinicMetadata({
  clinic,
  pageTitle,
  description,
  pathSuffix = "",
}: BuildMetadataInput): Metadata {
  const fullTitle = pageTitle ? `${pageTitle} · ${clinic.name}` : clinic.name;
  const url = clinicCanonical(clinic.slug, pathSuffix);
  const images = clinic.brand?.logoUrl
    ? [{ url: clinic.brand.logoUrl, alt: `${clinic.name} logo` }]
    : undefined;

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: fullTitle,
      description,
      siteName: clinic.name,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images,
    },
    robots: { index: true, follow: true },
  };
}
