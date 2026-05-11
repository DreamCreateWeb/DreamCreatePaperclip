import type { Route } from "next";
import Link from "next/link";

import type { Review } from "@/src/db/schema";

type Props = {
  reviews: Review[];
  avgRating: number;
  reviewCount: number;
  basePath: string;
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          style={{ color: s <= rating ? "var(--clinic-primary)" : "var(--color-rule)" }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function ReviewsSection({ reviews, avgRating, reviewCount, basePath }: Props) {
  if (reviewCount === 0) return null;

  return (
    <section className="border-t border-rule bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-[0.22em]"
              style={{ color: "var(--clinic-primary)" }}
            >
              Patient reviews
            </p>
            <h2 className="mt-3 font-display text-4xl text-ink">
              What our patients say
            </h2>
            {reviewCount > 0 ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
                <StarDisplay rating={Math.round(avgRating)} />
                <span>
                  {avgRating.toFixed(1)} average · {reviewCount}{" "}
                  {reviewCount === 1 ? "review" : "reviews"}
                </span>
              </p>
            ) : null}
          </div>
          <Link
            href={`${basePath}/reviews` as unknown as Route}
            className="text-xs font-medium uppercase tracking-[0.16em] underline-offset-4 hover:underline"
            style={{ color: "var(--clinic-primary)" }}
          >
            Leave a review →
          </Link>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 6).map((r) => (
            <li key={r.id} className="rounded-card border border-rule bg-canvas p-6">
              <div className="flex items-center justify-between">
                <StarDisplay rating={r.rating} />
                {r.serviceTag ? (
                  <span className="rounded-pill border border-rule px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                    {r.serviceTag}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                &ldquo;{r.body}&rdquo;
              </p>
              <p className="mt-4 text-xs font-medium text-ink-muted">
                — {r.patientName}
              </p>
              {r.clinicResponse ? (
                <div className="mt-4 border-t border-rule pt-3">
                  <p className="text-xs font-medium text-ink-muted">Response from the clinic:</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    {r.clinicResponse}
                  </p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        {reviews.length > 6 ? (
          <div className="mt-8 text-center">
            <Link
              href={`${basePath}/reviews` as unknown as Route}
              className="text-sm font-medium underline-offset-4 hover:underline"
              style={{ color: "var(--clinic-primary)" }}
            >
              View all {reviewCount} reviews →
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
