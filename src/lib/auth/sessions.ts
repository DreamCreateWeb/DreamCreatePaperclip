import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import {
  adminLoginTokens,
  adminSessions,
  adminUsers,
  type AdminUser,
} from "@/src/db/schema";

import { normalizeEmail } from "./admins";
import { randomToken, sha256Hex } from "./crypto";

export const SESSION_COOKIE_NAME = "dc_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const LOGIN_TOKEN_TTL_SECONDS = 60 * 15; // 15 minutes

export async function getOrCreateAdminUser(email: string): Promise<AdminUser> {
  const db = getDb();
  const normalized = normalizeEmail(email);
  const existing = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, normalized))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db
    .insert(adminUsers)
    .values({ email: normalized })
    .onConflictDoNothing({ target: adminUsers.email })
    .returning();
  if (created) return created;
  // race: another insert won — re-read
  const [row] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, normalized))
    .limit(1);
  return row;
}

export async function issueLoginToken(
  email: string,
  requestedIp: string | null,
): Promise<{ token: string; expiresAt: Date }> {
  const db = getDb();
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_SECONDS * 1000);
  await db.insert(adminLoginTokens).values({
    email: normalizeEmail(email),
    tokenHash,
    expiresAt,
    requestedIp,
  });
  return { token, expiresAt };
}

export async function consumeLoginToken(
  token: string,
): Promise<{ email: string } | null> {
  const db = getDb();
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const [row] = await db
    .select()
    .from(adminLoginTokens)
    .where(eq(adminLoginTokens.tokenHash, tokenHash))
    .limit(1);
  if (!row) return null;
  if (row.consumedAt) return null;
  if (row.expiresAt.getTime() < now.getTime()) return null;
  await db
    .update(adminLoginTokens)
    .set({ consumedAt: now })
    .where(eq(adminLoginTokens.id, row.id));
  return { email: row.email };
}

export async function createSession(userId: string): Promise<{
  sessionId: string;
  token: string;
  expiresAt: Date;
}> {
  const db = getDb();
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const [session] = await db
    .insert(adminSessions)
    .values({ userId, tokenHash, expiresAt })
    .returning({ id: adminSessions.id });
  return { sessionId: session.id, token, expiresAt };
}

export async function loadSession(
  sessionId: string,
  token: string,
): Promise<{ user: AdminUser } | null> {
  const db = getDb();
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const rows = await db
    .select({ session: adminSessions, user: adminUsers })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
    .where(
      and(
        eq(adminSessions.id, sessionId),
        eq(adminSessions.tokenHash, tokenHash),
      ),
    )
    .limit(1);
  if (rows.length === 0) return null;
  const { session, user } = rows[0];
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() < now.getTime()) return null;
  return { user };
}

export async function revokeSession(sessionId: string): Promise<void> {
  const db = getDb();
  await db
    .update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(adminSessions.id, sessionId), isNull(adminSessions.revokedAt)));
}

export async function recordLogin(userId: string): Promise<void> {
  const db = getDb();
  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUsers.id, userId));
}

