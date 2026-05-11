import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Resolves key for a given version number.
// INTAKE_ENCRYPTION_KEY (unversioned) is accepted as an alias for V1 for backward compat.
function getKeyForVersion(version: number): Buffer {
  const envVar = `INTAKE_ENCRYPTION_KEY_V${version}`;
  let hex = process.env[envVar];

  if (!hex && version === 1) {
    hex = process.env.INTAKE_ENCRYPTION_KEY;
  }

  if (!hex || hex.length !== 64) {
    throw new Error(
      `${envVar} must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32`,
    );
  }
  return Buffer.from(hex, "hex");
}

// Returns the highest configured key version number.
function getCurrentVersion(): number {
  let version = 0;
  let v = 1;
  while (process.env[`INTAKE_ENCRYPTION_KEY_V${v}`]) {
    version = v;
    v++;
  }

  if (version === 0) {
    if (process.env.INTAKE_ENCRYPTION_KEY) return 1;
    throw new Error(
      "No encryption key configured. Set INTAKE_ENCRYPTION_KEY_V1 (or INTAKE_ENCRYPTION_KEY for legacy) as a 64-character hex string.",
    );
  }

  return version;
}

// Ciphertext format: "v{N}:iv:authTag:ciphertext" (base64url, colon-separated).
// Legacy (pre-versioning) format: "iv:authTag:ciphertext" — treated as version 1 on decrypt.
export function encryptPhi(plaintext: string): string {
  const version = getCurrentVersion();
  const key = getKeyForVersion(version);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    `v${version}`,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptPhi(ciphertext: string): string {
  const parts = ciphertext.split(":");

  let version: number;
  let ivB64: string;
  let authTagB64: string;
  let encryptedB64: string;

  if (parts.length === 4 && /^v\d+$/.test(parts[0])) {
    version = parseInt(parts[0].slice(1), 10);
    [, ivB64, authTagB64, encryptedB64] = parts;
  } else if (parts.length === 3) {
    // Legacy format — assume version 1
    version = 1;
    [ivB64, authTagB64, encryptedB64] = parts;
  } else {
    throw new Error("Invalid PHI ciphertext format");
  }

  const key = getKeyForVersion(version);
  const iv = Buffer.from(ivB64, "base64url");
  const authTag = Buffer.from(authTagB64, "base64url");
  const encrypted = Buffer.from(encryptedB64, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}
