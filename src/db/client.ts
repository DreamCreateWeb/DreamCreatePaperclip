import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

let cachedClient: ReturnType<typeof postgres> | null = null;
let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env (Railway Postgres or local docker-compose).",
    );
  }
  // PgBouncer (Neon pooler) does not support channel_binding; strip it so
  // postgres.js doesn't send a SCRAM binding that the proxy rejects.
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return url;
  }
}

export function getDb() {
  if (cachedDb) return cachedDb;
  const client = postgres(getDatabaseUrl(), {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    prepare: false,
  });
  cachedClient = client;
  cachedDb = drizzle(client, { schema });
  return cachedDb;
}

export async function closeDb() {
  if (cachedClient) {
    await cachedClient.end({ timeout: 5 });
    cachedClient = null;
    cachedDb = null;
  }
}

export { schema };
