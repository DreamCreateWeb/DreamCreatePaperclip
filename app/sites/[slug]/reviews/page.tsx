import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClinicHeader } from "@/src/components/clinic/header";
import { ClinicFooter } from "@/src/components/clinic/footer";
import { ReviewForm } from "@/src/components/clinic/review-form";
import { ReviewsSection } from "@/src/components/clinic/reviews-section";
import { DEFAULT_REVIEW_CONFIG } from "@/src/db/schema";
import { getClinicBySlug } from "@/src/lib/clinic/get-clinic";
import { buildClinicMetadata } from "@/src/lib/clinic/page-metadata";
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
  return buildClinicMetadata({
    clinic,
    pageTitle: "Patient reviews",
    description: `Read patient reviews for ${clinic.name} and share your own experience.`,
    pathSuffix: "/reviews",
  });
}

export default async function ClinicReviewsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();

  const basePath = `/sites/${clinic.slug}`;
  const config = clinic.reviewConfig ?? DEFAULT_REVIEW_CONFIG;

  const [published, stats] = await Promise.all([
    listPublishedReviews(clinic.id),
    getReviewStats(clinic.id),
  ]);

  return (
    <>
      <ClinicHeader clinic={clinic} basePath={basePath} current="contact" />
      <main>
        <section
          className="border-b border-rule"
          style={{ background: "var(--clinic-primary-soft)" }}
        >
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <p
              className="text-xs font-medium uppercase tracking-[0.22em]"
              style={{ color: "var(--clinic-primary)" }}
            >
              Patient reviews
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
              What our patients say.
            </h1>
            {stats.reviewCount > 0 ? (
              <p className="mt-5 text-lg leading-relaxed text-ink-muted">
                {stats.avgRating.toFixed(1)} stars across {stats.reviewCount}{" "}
                {stats.reviewCount === 1 ? "review" : "reviews"}.
              </p>
            ) : null}
          </div>
        </section>

        {published.length > 0 ? (
          <ReviewsSection
            reviews={published}
            avgRating={stats.avgRating}
            reviewCount={stats.reviewCount}
            basePath={basePath}
          />
        ) : (
          <section className="mx-auto max-w-6xl px-6 py-16">
            <p className="text-sm text-ink-muted">
              No reviews yet — be the first to share your experience!
            </p>
          </section>
        )}

        {config.enabled ? (
          <section className="border-t border-rule bg-canvas py-16">
            <div className="mx-auto max-w-2xl px-6">
              <p
                className="text-xs font-medium uppercase tracking-[0.22em]"
                style={{ color: "var(--clinic-primary)" }}
              >
                Share your experience
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink">
                Leave a review
              </h2>
              <p className="mt-3 text-sm text-ink-muted">
                We&rsquo;d love to hear about your visit.
              </p>
              <div className="mt-8">
                <ReviewForm slug={clinic.slug} />
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <ClinicFooter clinic={clinic} basePath={basePath} />
    </>
  );
}
