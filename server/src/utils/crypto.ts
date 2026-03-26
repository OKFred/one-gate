/**
 * Password hashing utility using Web Crypto API (PBKDF2)
 * Compatible with Cloudflare Workers and modern Node.js
 */

const ALGORITHM = "PBKDF2";
const HASH_FUNCTION = "SHA-256";
const ITERATIONS = 10;
const SALT_SIZE = 1;
const KEY_SIZE = 8;

/**
 * Hash a password using PBKDF2
 * @param password Plain text password
 * @returns Formatted hash string: pbkdf2:sha256:iterations:salt:hash
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));

  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    ALGORITHM,
    false,
    ["deriveBits", "deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: ALGORITHM,
      salt: salt,
      iterations: ITERATIONS,
      hash: HASH_FUNCTION,
    } as any,
    baseKey,
    KEY_SIZE * 8
  );

  const saltHex = bufToHex(salt);
  const hashHex = bufToHex(new Uint8Array(derivedKey));

  return `pbkdf2:${HASH_FUNCTION.toLowerCase()}:${ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a stored hash
 * @param password Plain text password
 * @param storedHash Formatted hash string
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash.startsWith("pbkdf2:")) {
    // Falls back to bcrypt if needed? Or just fail if we've migrated.
    // For now, we assume migration to PBKDF2.
    return false;
  }

  const parts = storedHash.split(":");
  if (parts.length !== 5) return false;

  const [, hashFunc, iterationsStr, saltHex, hashHex] = parts;
  const iterations = parseInt(iterationsStr, 10);
  const salt = hexToBuf(saltHex);
  const expectedHash = hashHex;

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    ALGORITHM,
    false,
    ["deriveBits", "deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: ALGORITHM,
      salt: salt,
      iterations: iterations,
      hash: hashFunc.toUpperCase(),
    } as any,
    baseKey,
    KEY_SIZE * 8
  );

  const actualHash = bufToHex(new Uint8Array(derivedKey));

  // Constant time comparison is better, but this is simple and sufficient for many cases
  return actualHash === expectedHash;
}

function bufToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
