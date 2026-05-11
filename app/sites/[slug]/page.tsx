import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BeforeAfterGallery } from "@/src/components/clinic/before-after-gallery";
import { ClinicHeader } from "@/src/components/clinic/header";
import { ClinicHero } from "@/src/components/clinic/hero";
import { ClinicHeroModern } from "@/src/components/clinic/hero-modern";
import { CtaBand } from "@/src/components/clinic/cta-band";
import { HoursLocationCard } from "@/src/components/clinic/hours-card";
import { InsuranceCarousel } from "@/src/components/clinic/insurance-carousel";
import { ReviewsSection } from "@/src/components/clinic/reviews-section";
import { ServicesGrid } from "@/src/components/clinic/services-grid";
import { StickyCtaBar } from "@/src/components/clinic/sticky-bar";
import { TeamGrid } from "@/src/components/clinic/team-grid";
import { Testimonials } from "@/src/components/clinic/testimonials";
import { resolveBrand } from "@/src/lib/clinic/brand";
import { getClinicBySlug } from "@/src/lib/clinic/get-clinic";
import { aggregateRatingJsonLd, localBusinessJsonLd } from "@/src/lib/clinic/jsonld";
import {
  buildClinicMetadata,
  clinicCanonical,
} from "@/src/lib/clinic/page-metadata";
import {
  getReviewStats,
  listPublishedReviews,
} from "@/src/lib/reviews/review-service";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) return { title: "Not found", robots: { index: false } };
  const city = clinic.address?.city;
  const description = city
    ? `${clinic.name} — comfortable, modern dentistry in ${city}, ${
        clinic.address?.state ?? ""
      }. Same-day appointments available.`
    : `${clinic.name} — comfortable, modern dentistry. Same-day appointments available.`;
  return buildClinicMetadata({ clinic, description });
}

// Common insurance networks accepted at most Arkansas dental practices.
const DEFAULT_INSURERS = [
  { name: "Delta Dental" },
  { name: "BlueCross BlueShield" },
  { name: "Cigna" },
  { name: "Aetna" },
  { name: "United Healthcare" },
  { name: "MetLife" },
];

export default async function ClinicHomePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();

  const basePath = `/sites/${clinic.slug}`;
  const siteUrl = clinicCanonical(clinic.slug);
  const brand = resolveBrand(clinic.brand);
  const isModern = brand.template === "modern";

  const [published, stats] = await Promise.all([
    listPublishedReviews(clinic.id),
    getReviewStats(clinic.id),
  ]);

  const jsonLd = localBusinessJsonLd(clinic, siteUrl);
  const ratingLd =
    stats.reviewCount > 0
      ? aggregateRatingJsonLd(siteUrl, stats.avgRating, stats.reviewCount)
      : null;

  return (
    <>
      <ClinicHeader clinic={clinic} basePath={basePath} current="home" />
      <main>
        {isModern ? (
          <ClinicHeroModern clinic={clinic} basePath={basePath} />
        ) : (
          <ClinicHero clinic={clinic} basePath={basePath} />
        )}

        <ServicesGrid
          services={clinic.services.slice(0, 6)}
          heading="Care for every smile"
          intro="A focused set of services so we can do each one beautifully."
        />

        <InsuranceCarousel
          providers={DEFAULT_INSURERS}
          heading="We accept most major insurance plans"
        />

        <BeforeAfterGallery
          pairs={clinic.beforeAfterPairs ?? []}
          heading="Results you can see"
          intro="Real patients, real transformations."
        />

        {/* Modern variant places CTA before team/reviews */}
        {isModern && <CtaBand clinic={clinic} basePath={basePath} />}

        <TeamGrid
          team={clinic.team.slice(0, 3)}
          heading="The team you'll meet"
          intro="Friendly, credentialed, and genuinely glad to see you."
        />

        <Testimonials
          testimonials={clinic.testimonials}
          heading="What our patients say"
        />

        <ReviewsSection
          reviews={published}
          avgRating={stats.avgRating}
          reviewCount={stats.reviewCount}
          basePath={basePath}
        />

        <HoursLocationCard clinic={clinic} basePath={basePath} />

        {/* Warm variant places CTA at the bottom */}
        {!isModern && <CtaBand clinic={clinic} basePath={basePath} />}
      </main>

      <StickyCtaBar clinic={clinic} basePath={basePath} />

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {ratingLd ? (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ratingLd) }}
        />
      ) : null}
    </>
  );
}
