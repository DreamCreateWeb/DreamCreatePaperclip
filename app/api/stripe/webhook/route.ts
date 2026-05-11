import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/src/db/client";
import { clinics, provisioningRuns } from "@/src/db/schema";
import { getStripe } from "@/src/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function triggerProvisioning(clinicId: string) {
  const db = getDb();

  // Idempotency check: skip if active provisioning run exists
  const activeRun = await db
    .select()
    .from(provisioningRuns)
    .where(
      and(
        eq(provisioningRuns.clinicId, clinicId),
        ne(provisioningRuns.status, "failed"),
      ),
    )
    .limit(1);

  if (activeRun.length > 0) {
    console.log(
      `[stripe/webhook] skipping provisioning for clinic ${clinicId}: active run exists`,
    );
    return;
  }

  // Insert provisioning run
  await db.insert(provisioningRuns).values({
    clinicId,
    step: "clone",
    status: "pending",
  });

  // TODO: Call orchestrator to start provisioning (DRE-40)
  // For now, this is a stub:
  // const result = await runProvisioning(clinicId);
  console.log(
    `[stripe/webhook] provisioning queued for clinic ${clinicId}`,
  );
}

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
    const db = getDb();

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
          if (clinic && clinic.status === "pending_payment") {
            // Update clinic to provisioning
            await db
              .update(clinics)
              .set({ status: "provisioning", updatedAt: new Date() })
              .where(eq(clinics.id, clinic.id));

            // Trigger provisioning
            await triggerProvisioning(clinic.id);
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
          await db
            .update(clinics)
            .set({ status: "paused", updatedAt: new Date() })
            .where(eq(clinics.stripeCustomerId, customerId));

          // TODO: Alert ops via Google Chat webhook
          console.log(
            `[stripe/webhook] payment failed for customer ${customerId}`,
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await db
          .update(clinics)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(clinics.stripeSubscriptionId, sub.id));
        break;
      }
    }
  } catch (err) {
    console.error("[stripe/webhook] processing failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
