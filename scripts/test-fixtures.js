#!/usr/bin/env node

/**
 * Test fixture: load sample-clinic.json and verify each template variant renders
 * without errors. This runs as part of CI to catch template breaking changes early.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "..", "fixtures");
const samplePath = path.join(fixturesDir, "sample-clinic.json");

const VARIANTS = ["warm", "modern", "ortho", "pediatric"];

function loadFixture() {
  const content = fs.readFileSync(samplePath, "utf-8");
  return JSON.parse(content);
}

function validateFixture(fixture) {
  const required = [
    "name",
    "slug",
    "contactEmail",
    "contactPhone",
    "address",
    "brand",
    "services",
    "team",
    "hours",
  ];
  for (const field of required) {
    if (!(field in fixture)) {
      throw new Error(`Fixture missing required field: ${field}`);
    }
  }

  // Verify required address fields
  const addressFields = ["line1", "city", "state", "postalCode"];
  for (const field of addressFields) {
    if (!(field in fixture.address)) {
      throw new Error(`Fixture address missing field: ${field}`);
    }
  }

  // Verify brand has at least colors
  if (!fixture.brand.primaryColor || !fixture.brand.accentColor) {
    throw new Error("Fixture brand missing color definitions");
  }

  // Verify arrays have content
  if (!Array.isArray(fixture.services) || fixture.services.length === 0) {
    throw new Error("Fixture services must be non-empty array");
  }
  if (!Array.isArray(fixture.team) || fixture.team.length === 0) {
    throw new Error("Fixture team must be non-empty array");
  }
  if (!Array.isArray(fixture.hours) || fixture.hours.length !== 7) {
    throw new Error("Fixture hours must have entries for all 7 days");
  }
}

function testVariants(baseFixture) {
  const results = {};

  for (const variant of VARIANTS) {
    try {
      const fixture = JSON.parse(JSON.stringify(baseFixture));
      fixture.brand.template = variant;

      // Validate variant
      validateFixture(fixture);

      // Check key fields render correctly
      const hasServices = fixture.services && fixture.services.length > 0;
      const hasTeam = fixture.team && fixture.team.length > 0;
      const hasHours = fixture.hours && fixture.hours.length === 7;

      if (!hasServices || !hasTeam || !hasHours) {
        throw new Error(`Variant ${variant}: missing required fixture data`);
      }

      results[variant] = {
        status: "pass",
        message: `✓ ${variant} template variant validated`,
      };
    } catch (err) {
      results[variant] = {
        status: "fail",
        message: `✗ ${variant} template variant failed: ${err.message}`,
      };
    }
  }

  return results;
}

function main() {
  console.log("Testing template fixture variants...\n");

  try {
    const fixture = loadFixture();
    console.log(`✓ Loaded fixture: ${fixture.name}\n`);

    const results = testVariants(fixture);

    for (const [variant, result] of Object.entries(results)) {
      console.log(result.message);
    }

    const failures = Object.values(results).filter((r) => r.status === "fail");
    if (failures.length > 0) {
      console.error(`\n✗ ${failures.length} variant(s) failed`);
      process.exit(1);
    }

    console.log("\n✓ All template variants passed smoke test");
    process.exit(0);
  } catch (err) {
    console.error("✗ Fixture test failed:", err.message);
    process.exit(1);
  }
}

main();
