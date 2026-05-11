import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { encryptPhi, decryptPhi } from "./phi-crypto";

const KEY_V1 = "a".repeat(64); // 32 bytes of 0xaa
const KEY_V2 = "b".repeat(64); // 32 bytes of 0xbb

describe("phi-crypto", () => {
  before(() => {
    process.env.INTAKE_ENCRYPTION_KEY = KEY_V1;
  });

  after(() => {
    delete process.env.INTAKE_ENCRYPTION_KEY;
  });

  it("round-trips arbitrary plaintext", () => {
    const plain = "John Smith\x00jane@example.com\x001990-01-15\x00{\"tooth\":\"#4\"}";
    assert.equal(decryptPhi(encryptPhi(plain)), plain);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const a = encryptPhi("same input");
    const b = encryptPhi("same input");
    assert.notEqual(a, b);
  });

  it("new format includes version prefix", () => {
    const ct = encryptPhi("test");
    assert.match(ct, /^v1:/);
    assert.equal(ct.split(":").length, 4);
  });

  it("throws on missing key", () => {
    const saved = process.env.INTAKE_ENCRYPTION_KEY;
    delete process.env.INTAKE_ENCRYPTION_KEY;
    try {
      assert.throws(() => encryptPhi("test"), /No encryption key configured/);
    } finally {
      process.env.INTAKE_ENCRYPTION_KEY = saved;
    }
  });

  it("throws on tampered ciphertext (auth tag fails)", () => {
    const ct = encryptPhi("sensitive data");
    const parts = ct.split(":");
    // Corrupt the ciphertext segment (index 3) while preserving format
    const tampered = [parts[0], parts[1], parts[2], parts[3].slice(0, -4) + "XXXX"].join(":");
    assert.throws(() => decryptPhi(tampered));
  });

  it("throws on malformed ciphertext (wrong segment count)", () => {
    assert.throws(() => decryptPhi("notvalid"), /Invalid PHI ciphertext format/);
  });

  it("decrypts legacy 3-part ciphertext using version 1 key", () => {
    // Simulate a pre-versioning ciphertext (3-part format) by crafting one manually
    // using the Node.js crypto API directly to avoid calling encryptPhi (which now adds v prefix)
    const { createCipheriv, randomBytes } = require("crypto");
    const key = Buffer.from(KEY_V1, "hex");
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const plain = "legacy patient";
    const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const legacyCt = [
      iv.toString("base64url"),
      authTag.toString("base64url"),
      encrypted.toString("base64url"),
    ].join(":");

    assert.equal(legacyCt.split(":").length, 3);
    assert.equal(decryptPhi(legacyCt), plain);
  });

  describe("multi-version key rotation", () => {
    beforeEach(() => {
      process.env.INTAKE_ENCRYPTION_KEY_V1 = KEY_V1;
      process.env.INTAKE_ENCRYPTION_KEY_V2 = KEY_V2;
      delete process.env.INTAKE_ENCRYPTION_KEY;
    });

    afterEach(() => {
      delete process.env.INTAKE_ENCRYPTION_KEY_V1;
      delete process.env.INTAKE_ENCRYPTION_KEY_V2;
      process.env.INTAKE_ENCRYPTION_KEY = KEY_V1;
    });

    it("encryptPhi uses highest configured version (V2)", () => {
      const ct = encryptPhi("new record");
      assert.match(ct, /^v2:/);
    });

    it("decryptPhi with V2 ciphertext uses V2 key", () => {
      const ct = encryptPhi("v2 data");
      assert.match(ct, /^v2:/);
      assert.equal(decryptPhi(ct), "v2 data");
    });

    it("V1-encrypted data decrypts correctly when V2 is current", () => {
      // Encrypt with only V1 active
      delete process.env.INTAKE_ENCRYPTION_KEY_V2;
      const ctV1 = encryptPhi("old record");
      assert.match(ctV1, /^v1:/);

      // Re-enable V2, then decrypt old V1 ciphertext
      process.env.INTAKE_ENCRYPTION_KEY_V2 = KEY_V2;
      assert.equal(decryptPhi(ctV1), "old record");
    });

    it("round-trip across version upgrade", () => {
      // Encrypt with V1 only
      delete process.env.INTAKE_ENCRYPTION_KEY_V2;
      const v1ct = encryptPhi("patient data");

      // Simulate rotation: add V2, re-encrypt
      process.env.INTAKE_ENCRYPTION_KEY_V2 = KEY_V2;
      const plaintext = decryptPhi(v1ct);
      const v2ct = encryptPhi(plaintext);

      assert.match(v2ct, /^v2:/);
      assert.equal(decryptPhi(v2ct), "patient data");
    });

    it("throws on unknown version key", () => {
      const fakeCt = "v99:aXYZ:dGFnWFla:Y2lwaGVy";
      assert.throws(() => decryptPhi(fakeCt), /INTAKE_ENCRYPTION_KEY_V99/);
    });
  });
});
