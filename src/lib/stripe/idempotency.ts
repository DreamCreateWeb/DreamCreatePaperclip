import { lt } from "drizzle-orm";

import type { getDb } from "@/src/db/client";
import { processedStripeEvents } from "@/src/db/schema";

export type DrizzleDb = ReturnType<typeof getDb>;

/**
 * Atomically claims a Stripe event ID. Returns true if this is the first time
 * the event has been seen (caller should process it), false if it was already
 * processed (caller should return 200 immediately without side effects).
 *
 * Uses ON CONFLICT DO NOTHING so concurrent webhook deliveries resolve without
 * a TOCTOU race — the primary key constraint is the true guard.
 */
export async function claimStripeEvent(
  db: DrizzleDb,
  eventId: string,
): Promise<boolean> {
  const inserted = await db
    .insert(processedStripeEvents)
    .values({ stripeEventId: eventId })
    .onConflictDoNothing()
    .returning({ stripeEventId: processedStripeEvents.stripeEventId });
  return inserted.length > 0;
}

/**
 * Deletes processed_stripe_events rows older than 30 days.
 * Stripe only replays events within 72 hours, so 30 days provides ample buffer.
 */
export async function pruneOldStripeEvents(db: DrizzleDb): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const deleted = await db
    .delete(processedStripeEvents)
    .where(lt(processedStripeEvents.processedAt, cutoff))
    .returning({ stripeEventId: processedStripeEvents.stripeEventId });
  return deleted.length;
}
