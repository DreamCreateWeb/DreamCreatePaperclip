import type { Clinic, DayOfWeek } from "@/src/db/schema";
import { orderedHours } from "./format";

const SCHEMA_DAY: Record<DayOfWeek, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export function localBusinessJsonLd(
  clinic: Clinic,
  siteUrl: string,
): Record<string, unknown> {
  const address = clinic.address
    ? {
        "@type": "PostalAddress",
        streetAddress: [clinic.address.line1, clinic.address.line2]
          .filter(Boolean)
          .join(", "),
        addressLocality: clinic.address.city,
        addressRegion: clinic.address.state,
        postalCode: clinic.address.postalCode,
        addressCountry: "US",
      }
    : undefined;

  const openingHoursSpecification = orderedHours(clinic.hours)
    .filter((h) => !h.closed && h.open && h.close)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: SCHEMA_DAY[h.day],
      opens: h.open,
      closes: h.close,
    }));

  const sameAs = [
    clinic.social?.facebook,
    clinic.social?.instagram,
    clinic.social?.google,
    clinic.social?.website,
  ].filter((v): v is string => Boolean(v));

  return {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: clinic.name,
    url: siteUrl,
    email: clinic.contactEmail,
    telephone: clinic.contactPhone ?? undefined,
    image: clinic.brand?.logoUrl ?? undefined,
    address,
    openingHoursSpecification:
      openingHoursSpecification.length > 0 ? openingHoursSpecification : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

export function aggregateRatingJsonLd(
  siteUrl: string,
  ratingValue: number,
  reviewCount: number,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Dentist",
    url: siteUrl,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: ratingValue.toFixed(1),
      reviewCount: String(reviewCount),
      bestRating: "5",
      worstRating: "1",
    },
  };
}
