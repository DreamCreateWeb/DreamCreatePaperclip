/**
 * Re-encrypts all intakeSubmissions PHI fields from an old key version to the current key version.
 *
 * Usage:
 *   INTAKE_ENCRYPTION_KEY_V1=<old-hex> INTAKE_ENCRYPTION_KEY_V2=<new-hex> \
 *     tsx scripts/rotate-intake-key.ts
 *
 * The script decrypts each row using whichever key version is embedded in the ciphertext,
 * then re-encrypts it with the current (highest) version key.
 * Rows already at the current version are skipped.
 */
import "dotenv/config";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { intakeSubmissions } from "@/src/db/schema";
import { decryptPhi, encryptPhi } from "@/src/lib/phi-crypto";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

function currentVersion(): number {
  let v = 1;
  while (process.env[`INTAKE_ENCRYPTION_KEY_V${v + 1}`]) v++;
  if (!process.env[`INTAKE_ENCRYPTION_KEY_V1`] && !process.env.INTAKE_ENCRYPTION_KEY) {
    console.error("No encryption key configured. Set at least INTAKE_ENCRYPTION_KEY_V1.");
    process.exit(1);
  }
  return v;
}

function versionOf(ct: string): number {
  const parts = ct.split(":");
  if (parts.length === 4 && /^v\d+$/.test(parts[0])) {
    return parseInt(parts[0].slice(1), 10);
  }
  return 1; // legacy unversioned = V1
}

const PHI_FIELDS = ["patientName", "patientEmail", "patientDob", "responses"] as const;

async function main() {
  const targetVersion = currentVersion();
  console.log(`Target key version: V${targetVersion}`);

  const client = postgres(databaseUrl!, { max: 1, prepare: false });
  const db = drizzle(client);

  const rows = await db.select().from(intakeSubmissions);
  console.log(`Found ${rows.length} submissions to inspect.`);

  let rotated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const needsRotation = PHI_FIELDS.some((field) => {
      const val = row[field];
      return val !== null && versionOf(val) !== targetVersion;
    });

    if (!needsRotation) {
      skipped++;
      continue;
    }

    try {
      const updates: Partial<typeof row> = {};

      for (const field of PHI_FIELDS) {
        const val = row[field];
        if (val === null) continue;
        if (versionOf(val) === targetVersion) continue;
        updates[field] = encryptPhi(decryptPhi(val));
      }

      await db
        .update(intakeSubmissions)
        .set(updates)
        .where(eq(intakeSubmissions.id, row.id));

      rotated++;
      if (rotated % 50 === 0) {
        console.log(`  Rotated ${rotated} rows so far...`);
      }
    } catch (err) {
      console.error(`  Error rotating submission ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
      errors++;
    }
  }

  console.log(`\nDone. Rotated: ${rotated}, Already current: ${skipped}, Errors: ${errors}`);
  await client.end({ timeout: 5 });

  if (errors > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
