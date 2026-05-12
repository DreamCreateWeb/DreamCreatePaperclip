import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/src/db/client";
import { clinics } from "@/src/db/schema";
import { getStripe, getStripeWebhookSecret } from "@/src/lib/stripe/client";
import { claimStripeEvent } from "@/src/lib/stripe/idempotency";
import { runProvisioning } from "@/src/lib/provisioning/orchestrate";
import {
  pauseUptimeMonitor,
  resumeUptimeMonitor,
} from "@/src/lib/uptime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let webhookSecret: string;
  try {
    webhookSecret = getStripeWebhookSecret();
  } catch {
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
    const db = getDb();

    // Idempotency: claim the event ID before processing. ON CONFLICT DO NOTHING
    // means a concurrent or replayed delivery of the same event ID returns early.
    const claimed = await claimStripeEvent(db, event.id);
    if (!claimed) {
      console.log(`[stripe/webhook] duplicate event ignored: ${event.id}`);
      return NextResponse.json({ received: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const clinicId = session.metadata?.clinicId;
        if (clinicId) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : (session.subscription as { id?: string } | null)?.id ?? null;
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id ?? null;

          await db
            .update(clinics)
            .set({
              status: "pending_payment",
              ...(subscriptionId
                ? { stripeSubscriptionId: subscriptionId }
                : {}),
              ...(customerId ? { stripeCustomerId: customerId } : {}),
              updatedAt: new Date(),
            })
            .where(eq(clinics.id, clinicId));
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (customerId) {
          // Find clinic by customer ID
          const clinicResult = await db
            .select()
            .from(clinics)
            .where(eq(clinics.stripeCustomerId, customerId))
            .limit(1);

          const clinic = clinicResult[0];
          if (clinic) {
            if (clinic.status === "pending_payment") {
              await db
                .update(clinics)
                .set({ status: "provisioning", updatedAt: new Date() })
                .where(eq(clinics.id, clinic.id));
              void runProvisioning(clinic.id).catch((err) =>
                console.error("[stripe/webhook] provisioning failed", err),
              );
            } else if (
              (clinic.status === "paused" || clinic.status === "past_due") &&
              clinic.uptimeMonitorId
            ) {
              // Payment recovered — resume uptime checks
              await resumeUptimeMonitor(clinic.uptimeMonitorId).catch((e) =>
                console.error("[stripe/webhook] resumeMonitor failed", e),
              );
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (customerId) {
          const affected = await db
            .update(clinics)
            .set({ status: "paused", updatedAt: new Date() })
            .where(eq(clinics.stripeCustomerId, customerId))
            .returning({ uptimeMonitorId: clinics.uptimeMonitorId });

          const monitorId = affected[0]?.uptimeMonitorId;
          if (monitorId) {
            await pauseUptimeMonitor(monitorId).catch((e) =>
              console.error("[stripe/webhook] pauseMonitor failed", e),
            );
          }

          console.log(
            `[stripe/webhook] payment failed for customer ${customerId}`,
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const affected = await db
          .update(clinics)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(clinics.stripeSubscriptionId, sub.id))
          .returning({ uptimeMonitorId: clinics.uptimeMonitorId });

        const monitorId = affected[0]?.uptimeMonitorId;
        if (monitorId) {
          await pauseUptimeMonitor(monitorId).catch((e) =>
            console.error("[stripe/webhook] pauseMonitor(cancelled) failed", e),
          );
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe/webhook] processing failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
