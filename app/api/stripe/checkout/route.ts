import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/src/db/client";
import { clinics } from "@/src/db/schema";
import { getStripe } from "@/src/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const clinicId = (body as Record<string, unknown>)?.clinicId;
  if (typeof clinicId !== "string" || !clinicId) {
    return NextResponse.json({ error: "clinicId required" }, { status: 400 });
  }

  const db = getDb();
  const clinic = await db.query.clinics.findFirst({
    where: eq(clinics.id, clinicId),
  });
  if (!clinic) {
    return NextResponse.json({ error: "clinic_not_found" }, { status: 404 });
  }

  const stripe = getStripe();

  // Idempotency: return existing in-flight session if still valid
  if (clinic.stripeCheckoutSessionId && clinic.status === "pending_payment") {
    try {
      const existing = await stripe.checkout.sessions.retrieve(
        clinic.stripeCheckoutSessionId,
      );
      if (existing.status === "open" && existing.url) {
        return NextResponse.json({ url: existing.url });
      }
    } catch {
      // Session not found or expired — fall through to create a new one
    }
  }

  // Create Stripe Customer if needed
  let stripeCustomerId = clinic.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: clinic.contactEmail,
      name: clinic.name,
      metadata: { clinicId, slug: clinic.slug },
    });
    stripeCustomerId = customer.id;
  }

  const priceId =
    process.env.STRIPE_PRICE_CLINIC_MONTHLY ?? process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_PRICE_CLINIC_MONTHLY not configured" },
      { status: 503 },
    );
  }

  const base = appUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/onboard/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/onboard/cancel?clinic_id=${clinicId}`,
    metadata: { clinicId, slug: clinic.slug },
  });

  await db
    .update(clinics)
    .set({
      stripeCustomerId,
      stripeCheckoutSessionId: session.id,
      status: "pending_payment",
      updatedAt: new Date(),
    })
    .where(eq(clinics.id, clinicId));

  return NextResponse.json({ url: session.url });
}
