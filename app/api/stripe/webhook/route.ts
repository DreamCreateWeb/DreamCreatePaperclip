import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/src/db/client";
import { clinics } from "@/src/db/schema";
import { getStripe } from "@/src/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed", err);
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await getDb()
          .update(clinics)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(clinics.stripeSubscriptionId, sub.id));
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (customerId) {
          await getDb()
            .update(clinics)
            .set({ status: "past_due", updatedAt: new Date() })
            .where(eq(clinics.stripeCustomerId, customerId));
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (customerId) {
          await getDb()
            .update(clinics)
            .set({ status: "live", updatedAt: new Date() })
            .where(
              and(
                eq(clinics.stripeCustomerId, customerId),
                eq(clinics.status, "past_due"),
              ),
            );
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe/webhook] db update failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
