import { describe, it, expect } from "vitest";

import { claimStripeEvent, pruneOldStripeEvents } from "@/src/lib/stripe/idempotency";
import type { DrizzleDb } from "@/src/lib/stripe/idempotency";

// ---------------------------------------------------------------------------
// Minimal in-memory mock of the Drizzle DB surface used by the helpers.
// We simulate the processedStripeEvents table with a plain Map so the test
// exercises the same insert/conflict/delete logic without hitting Postgres.
// ---------------------------------------------------------------------------

function makeMockDb() {
  const stored = new Map<string, Date>(); // stripeEventId -> processedAt

  const db = {
    insert: (_table: unknown) => ({
      values: (row: { stripeEventId: string; processedAt?: Date }) => ({
        onConflictDoNothing: () => ({
          returning: () => {
            if (stored.has(row.stripeEventId)) {
              return Promise.resolve([]); // duplicate → no-op
            }
            stored.set(row.stripeEventId, row.processedAt ?? new Date());
            return Promise.resolve([{ stripeEventId: row.stripeEventId }]);
          },
        }),
      }),
    }),
    delete: (_table: unknown) => ({
      where: (_condition: unknown) => ({
        returning: () => {
          // The mock clears all rows to simulate the WHERE cutoff removing them.
          // In production the WHERE is evaluated server-side; here we verify
          // the delete path is invoked and returns the right count.
          const removed = [...stored.entries()].map(([id]) => ({ stripeEventId: id }));
          stored.clear();
          return Promise.resolve(removed);
        },
      }),
    }),
    _stored: stored,
  };

  return db as unknown as DrizzleDb & { _stored: Map<string, Date> };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("claimStripeEvent", () => {
  it("returns true on first claim", async () => {
    const db = makeMockDb();
    const result = await claimStripeEvent(db, "evt_test_001");
    expect(result).toBe(true);
    expect(db._stored.size).toBe(1);
  });

  it("returns false on duplicate and makes no additional DB write", async () => {
    const db = makeMockDb();

    const first = await claimStripeEvent(db, "evt_test_002");
    const second = await claimStripeEvent(db, "evt_test_002");

    expect(first).toBe(true);
    expect(second).toBe(false);
    // The event ID appears exactly once — no duplicate row was inserted
    expect(db._stored.size).toBe(1);
  });

  it("allows distinct event IDs to both be claimed", async () => {
    const db = makeMockDb();

    const r1 = await claimStripeEvent(db, "evt_a");
    const r2 = await claimStripeEvent(db, "evt_b");

    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(db._stored.size).toBe(2);
  });
});

describe("pruneOldStripeEvents", () => {
  it("returns count of deleted rows", async () => {
    const db = makeMockDb();

    // Pre-seed two events
    await claimStripeEvent(db, "evt_old_1");
    await claimStripeEvent(db, "evt_old_2");
    expect(db._stored.size).toBe(2);

    const deleted = await pruneOldStripeEvents(db);

    expect(deleted).toBe(2);
    // Mock clears all rows to simulate the WHERE cutoff removing them
    expect(db._stored.size).toBe(0);
  });
});
