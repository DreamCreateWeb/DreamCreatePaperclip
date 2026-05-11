import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { encryptPhi, decryptPhi } from "./phi-crypto";

const TEST_KEY = "a".repeat(64); // 32 bytes of 0xaa — getKey() reads env at call time

describe("phi-crypto", () => {
  before(() => {
    process.env.INTAKE_ENCRYPTION_KEY = TEST_KEY;
  });

  after(() => {
    delete process.env.INTAKE_ENCRYPTION_KEY;
  });

  it("round-trips arbitrary plaintext", () => {
    process.env.INTAKE_ENCRYPTION_KEY = TEST_KEY;
    const plain = "John Smith\x00jane@example.com\x001990-01-15\x00{\"tooth\":\"#4\"}";
    assert.equal(decryptPhi(encryptPhi(plain)), plain);
  });

  it("produces different ciphertext each call (random IV)", () => {
    process.env.INTAKE_ENCRYPTION_KEY = TEST_KEY;
    const a = encryptPhi("same input");
    const b = encryptPhi("same input");
    assert.notEqual(a, b);
  });

  it("throws on missing key", () => {
    const saved = process.env.INTAKE_ENCRYPTION_KEY;
    delete process.env.INTAKE_ENCRYPTION_KEY;
    try {
      assert.throws(() => encryptPhi("test"), /INTAKE_ENCRYPTION_KEY/);
    } finally {
      process.env.INTAKE_ENCRYPTION_KEY = saved;
    }
  });

  it("throws on tampered ciphertext (auth tag fails)", () => {
    process.env.INTAKE_ENCRYPTION_KEY = TEST_KEY;
    const ct = encryptPhi("sensitive data");
    const [iv, tag, data] = ct.split(":");
    // flip last byte of data
    const tampered = `${iv}:${tag}:${data.slice(0, -4)}XXXX`;
    assert.throws(() => decryptPhi(tampered));
  });

  it("throws on malformed ciphertext (wrong segment count)", () => {
    process.env.INTAKE_ENCRYPTION_KEY = TEST_KEY;
    assert.throws(() => decryptPhi("notvalid"), /Invalid PHI ciphertext format/);
  });
});
