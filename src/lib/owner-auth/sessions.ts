import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { normalizeEmail } from "@/src/lib/auth/admins";
import { randomToken, sha256Hex } from "@/src/lib/auth/crypto";
import {
  clinicOwnerLoginTokens,
  clinicOwnerSessions,
  clinicOwnerUsers,
  clinics,
  type Clinic,
  type ClinicOwnerUser,
} from "@/src/db/schema";

export { OWNER_SESSION_COOKIE_NAME } from "./constants";
export const OWNER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const OWNER_LOGIN_TOKEN_TTL_SECONDS = 60 * 15; // 15 minutes

export type OwnerWithClinic = {
  user: ClinicOwnerUser;
  clinic: Clinic;
};

export async function findOwnerByEmail(
  email: string,
): Promise<OwnerWithClinic | null> {
  const db = getDb();
  const normalized = normalizeEmail(email);
  const rows = await db
    .select({ user: clinicOwnerUsers, clinic: clinics })
    .from(clinicOwnerUsers)
    .innerJoin(clinics, eq(clinicOwnerUsers.clinicId, clinics.id))
    .where(eq(clinicOwnerUsers.email, normalized))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Bootstrap rule: if no owner row exists for `email`, but a clinic has that
 * email as its `contactEmail`, create the owner row and link them. This is how
 * the very first owner gets access without requiring an admin invite.
 */
export async function findOrBootstrapOwnerByEmail(
  email: string,
): Promise<OwnerWithClinic | null> {
  const existing = await findOwnerByEmail(email);
  if (existing) return existing;

  const db = getDb();
  const normalized = normalizeEmail(email);
  const [matchedClinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.contactEmail, normalized))
    .limit(1);
  if (!matchedClinic) return null;

  const [created] = await db
    .insert(clinicOwnerUsers)
    .values({ email: normalized, clinicId: matchedClinic.id })
    .onConflictDoNothing({ target: clinicOwnerUsers.email })
    .returning();

  if (created) return { user: created, clinic: matchedClinic };
  // race: another insert won — re-read
  return findOwnerByEmail(normalized);
}

export async function issueOwnerLoginToken(
  email: string,
  requestedIp: string | null,
): Promise<{ token: string; expiresAt: Date }> {
  const db = getDb();
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(
    Date.now() + OWNER_LOGIN_TOKEN_TTL_SECONDS * 1000,
  );
  await db.insert(clinicOwnerLoginTokens).values({
    email: normalizeEmail(email),
    tokenHash,
    expiresAt,
    requestedIp,
  });
  return { token, expiresAt };
}

export async function consumeOwnerLoginToken(
  token: string,
): Promise<{ email: string } | null> {
  const db = getDb();
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const [row] = await db
    .select()
    .from(clinicOwnerLoginTokens)
    .where(eq(clinicOwnerLoginTokens.tokenHash, tokenHash))
    .limit(1);
  if (!row) return null;
  if (row.consumedAt) return null;
  if (row.expiresAt.getTime() < now.getTime()) return null;
  await db
    .update(clinicOwnerLoginTokens)
    .set({ consumedAt: now })
    .where(eq(clinicOwnerLoginTokens.id, row.id));
  return { email: row.email };
}

export async function createOwnerSession(userId: string): Promise<{
  sessionId: string;
  token: string;
  expiresAt: Date;
}> {
  const db = getDb();
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + OWNER_SESSION_TTL_SECONDS * 1000);
  const [session] = await db
    .insert(clinicOwnerSessions)
    .values({ userId, tokenHash, expiresAt })
    .returning({ id: clinicOwnerSessions.id });
  return { sessionId: session.id, token, expiresAt };
}

export async function loadOwnerSession(
  sessionId: string,
  token: string,
): Promise<OwnerWithClinic | null> {
  const db = getDb();
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const rows = await db
    .select({
      session: clinicOwnerSessions,
      user: clinicOwnerUsers,
      clinic: clinics,
    })
    .from(clinicOwnerSessions)
    .innerJoin(
      clinicOwnerUsers,
      eq(clinicOwnerSessions.userId, clinicOwnerUsers.id),
    )
    .innerJoin(clinics, eq(clinicOwnerUsers.clinicId, clinics.id))
    .where(
      and(
        eq(clinicOwnerSessions.id, sessionId),
        eq(clinicOwnerSessions.tokenHash, tokenHash),
      ),
    )
    .limit(1);
  if (rows.length === 0) return null;
  const { session, user, clinic } = rows[0];
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() < now.getTime()) return null;
  return { user, clinic };
}

export async function revokeOwnerSession(sessionId: string): Promise<void> {
  const db = getDb();
  await db
    .update(clinicOwnerSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(clinicOwnerSessions.id, sessionId),
        isNull(clinicOwnerSessions.revokedAt),
      ),
    );
}

export async function revokeAllOwnerSessions(userId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .update(clinicOwnerSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(clinicOwnerSessions.userId, userId),
        isNull(clinicOwnerSessions.revokedAt),
      ),
    )
    .returning({ id: clinicOwnerSessions.id });
  return rows.length;
}

export async function recordOwnerLogin(userId: string): Promise<void> {
  const db = getDb();
  await db
    .update(clinicOwnerUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(clinicOwnerUsers.id, userId));
}
