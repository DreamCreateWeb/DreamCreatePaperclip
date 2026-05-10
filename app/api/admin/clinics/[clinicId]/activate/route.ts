import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/src/db/client";
import { clinics } from "@/src/db/schema";
import { getCurrentAdminUser } from "@/src/lib/auth/current-user";
import { getStripe } from "@/src/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ clinicId: string }> },
) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "unauthenticated" },
      { status: 401 },
    );
  }

  const { clinicId } = await params;

  const db = getDb();
  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  if (!clinic) {
    return NextResponse.json(
      { ok: false, error: "clinic_not_found" },
      { status: 404 },
    );
  }

  const priceId = process.env.STRIPE_PRICE_CLINIC_MONTHLY;
  if (!priceId) {
    return NextResponse.json(
      { ok: false, error: "stripe_price_not_configured" },
      { status: 500 },
    );
  }

  try {
    const stripe = getStripe();

    const customer = await stripe.customers.create({
      email: clinic.contactEmail,
      name: clinic.name,
      metadata: { clinicId: clinic.id },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    await db
      .update(clinics)
      .set({
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        ...(clinic.status === "draft" ? { status: "pending_payment" } : {}),
        updatedAt: new Date(),
      })
      .where(eq(clinics.id, clinicId));

    return NextResponse.json({
      ok: true,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
    });
  } catch (err) {
    console.error("[admin/clinics/activate] stripe error", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}
