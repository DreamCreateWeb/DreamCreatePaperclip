import "dotenv/config";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "DATABASE_URL is not set. Add it to .env (Railway Postgres or local docker-compose).",
  );
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1, prepare: false });
const db = drizzle(client);

async function main() {
  console.log("Running migrations from ./drizzle ...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
  await client.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  await client.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
});
