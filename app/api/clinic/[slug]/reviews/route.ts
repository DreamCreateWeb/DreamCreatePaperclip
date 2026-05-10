import { NextResponse } from "next/server";
import { z } from "zod";

import { getClinicBySlug } from "@/src/lib/clinic/get-clinic";
import { flattenZodErrors } from "@/src/lib/onboarding/schema";
import { clientIp, rateLimit } from "@/src/lib/rate-limit";
import {
  getReviewStats,
  listPublishedReviews,
  submitReview,
} from "@/src/lib/reviews/review-service";
import { DEFAULT_REVIEW_CONFIG } from "@/src/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

const reviewSubmitSchema = z.object({
  patientName: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(5).max(2000),
  serviceTag: z.string().max(80).optional(),
  nickname: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = clientIp(req);
  const limitKey = `clinic-review:${slug}:${ip ?? "anon"}`;
  const gate = rateLimit(limitKey, RATE_LIMIT_PER_HOUR, RATE_LIMIT_WINDOW_SECONDS);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = reviewSubmitSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", fieldErrors: flattenZodErrors(parsed.error) },
      { status: 422 },
    );
  }

  // Honeypot
  if (parsed.data.nickname && parsed.data.nickname.length > 0) {
    return NextResponse.json({ ok: true, queued: true });
  }

  const clinic = await getClinicBySlug(slug);
  if (!clinic) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const config = clinic.reviewConfig ?? DEFAULT_REVIEW_CONFIG;
  if (!config.enabled) {
    return NextResponse.json({ ok: false, error: "reviews_disabled" }, { status: 404 });
  }

  const result = await submitReview(
    clinic,
    {
      patientName: parsed.data.patientName,
      rating: parsed.data.rating,
      body: parsed.data.body,
      serviceTag: parsed.data.serviceTag,
    },
    { ip },
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    status: result.review.status,
    pending: result.review.status === "pending",
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const [published, stats] = await Promise.all([
    listPublishedReviews(clinic.id),
    getReviewStats(clinic.id),
  ]);

  return NextResponse.json({ ok: true, reviews: published, stats });
}
