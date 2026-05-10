import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";
import {
  getReviewStats,
  listReviewsForClinic,
} from "@/src/lib/reviews/review-service";

import { ReviewRowActions } from "./review-row-actions";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "published", label: "Published" },
  { key: "hidden", label: "Hidden" },
  { key: "all", label: "All" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const STATUS_TONES: Record<string, { label: string; tone: string }> = {
  pending: { label: "Pending", tone: "bg-amber-100 text-amber-900" },
  published: { label: "Published", tone: "bg-emerald-100 text-emerald-900" },
  hidden: { label: "Hidden", tone: "bg-stone-200 text-stone-800" },
};

function Stars({ rating }: { rating: number }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-amber-400" : "text-stone-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default async function OwnerReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const owner = await getCurrentClinicOwner();
  if (!owner) return null;

  const params = await searchParams;
  const rawFilter = (params.filter ?? "pending") as FilterKey;
  const filter: FilterKey = FILTERS.some((f) => f.key === rawFilter)
    ? rawFilter
    : "pending";

  const statuses =
    filter === "all"
      ? undefined
      : ([filter] as ["pending"] | ["published"] | ["hidden"]);

  const [allReviews, stats] = await Promise.all([
    listReviewsForClinic(owner.clinic.id, statuses),
    getReviewStats(owner.clinic.id),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Reviews
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] text-ink">
            Patient reviews
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            Approve, hide, or respond to patient reviews.
            {stats.reviewCount > 0 ? (
              <> Currently {stats.avgRating.toFixed(1)} stars across {stats.reviewCount} published {stats.reviewCount === 1 ? "review" : "reviews"}.</>
            ) : null}
          </p>
        </div>
      </header>

      <nav
        aria-label="Filter reviews"
        className="flex flex-wrap items-center gap-1 border-b border-rule"
      >
        {FILTERS.map((f) => {
          const active = f.key === filter;
          const href =
            f.key === "pending"
              ? "/portal/reviews"
              : `/portal/reviews?filter=${f.key}`;
          return (
            <a
              key={f.key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "border-b-2 px-4 py-2 text-sm transition " +
                (active
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-muted hover:border-rule hover:text-ink")
              }
            >
              {f.label}
            </a>
          );
        })}
      </nav>

      {allReviews.length === 0 ? (
        <div className="rounded-card border border-rule bg-white p-10 text-center">
          <p className="text-sm font-medium text-ink">No {filter === "all" ? "" : filter} reviews yet</p>
          <p className="mt-2 text-sm text-ink-muted">
            When patients leave reviews on your site, they&rsquo;ll appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {allReviews.map((r) => {
            const tone = STATUS_TONES[r.status] ?? {
              label: r.status,
              tone: "bg-stone-200 text-stone-800",
            };
            return (
              <li key={r.id} className="rounded-card border border-rule bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {r.patientName}
                      <span
                        className={`ml-3 inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${tone.tone}`}
                      >
                        {tone.label}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      <Stars rating={r.rating} />
                      {r.serviceTag ? <> · {r.serviceTag}</> : null}
                    </p>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {new Date(r.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-ink">
                  &ldquo;{r.body}&rdquo;
                </p>
                {r.clinicResponse ? (
                  <div className="mt-3 rounded border border-rule bg-canvas px-3 py-2">
                    <p className="text-xs font-medium text-ink-muted">Your response:</p>
                    <p className="mt-1 text-xs text-ink-muted">{r.clinicResponse}</p>
                  </div>
                ) : null}
                <div className="mt-4 border-t border-rule pt-3">
                  <ReviewRowActions
                    reviewId={r.id}
                    status={r.status}
                    clinicResponse={r.clinicResponse}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
