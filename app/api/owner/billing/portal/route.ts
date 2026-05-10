import { NextResponse } from "next/server";

import { getCurrentClinicOwner } from "@/src/lib/owner-auth/current-user";
import { getStripe } from "@/src/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
  const owner = await getCurrentClinicOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, error: "unauthenticated" },
      { status: 401 },
    );
  }

  const { clinic } = owner;
  if (!clinic.stripeCustomerId) {
    return NextResponse.json(
      { ok: false, error: "no_subscription" },
      { status: 400 },
    );
  }

  const returnUrl =
    (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "") +
    "/owner/dashboard";

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: clinic.stripeCustomerId,
      return_url: returnUrl,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[owner/billing/portal] stripe error", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}
