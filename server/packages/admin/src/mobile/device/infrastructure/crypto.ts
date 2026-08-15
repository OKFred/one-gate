import { getEnv } from "@hodor/core/utils/env";
import type { DeviceCryptoPort } from "../application/ports.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const CIPHER_VERSION = "v1";

function toBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importSensitiveKey(): Promise<CryptoKey> {
  const raw = getEnv("MOBILE_SENSITIVE_DATA_KEY");
  if (!raw) {
    throw new Error("MOBILE_SENSITIVE_DATA_KEY is required for sensitive data");
  }
  let keyBytes: Uint8Array;
  try {
    keyBytes = fromBase64(raw.trim());
  } catch {
    throw new Error("MOBILE_SENSITIVE_DATA_KEY must be valid Base64");
  }
  if (keyBytes.byteLength !== 32) {
    throw new Error("MOBILE_SENSITIVE_DATA_KEY must decode to 32 bytes");
  }
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSensitiveText(
  plaintext: string,
  aad: string
): Promise<string> {
  const key = await importSensitiveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: encoder.encode(aad),
      tagLength: 128,
    },
    key,
    encoder.encode(plaintext)
  );
  return `${CIPHER_VERSION}.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptSensitiveText(
  ciphertext: string,
  aad: string
): Promise<string> {
  const [version, ivText, encryptedText, extra] = ciphertext.split(".");
  if (version !== CIPHER_VERSION || !ivText || !encryptedText || extra) {
    throw new Error("Unsupported sensitive ciphertext format");
  }
  const key = await importSensitiveKey();
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(ivText),
      additionalData: encoder.encode(aad),
      tagLength: 128,
    },
    key,
    fromBase64(encryptedText)
  );
  return decoder.decode(decrypted);
}

export async function hashDeviceToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return toBase64Url(new Uint8Array(digest));
}

export async function verifyDeviceToken(
  token: string,
  expectedHash: string
): Promise<boolean> {
  const actual = encoder.encode(await hashDeviceToken(token));
  const expected = encoder.encode(expectedHash);
  if (actual.byteLength !== expected.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < actual.byteLength; index += 1) {
    difference |= actual[index] ^ expected[index];
  }
  return difference === 0;
}

export async function generateDeviceToken(): Promise<{
  token: string;
  tokenHash: string;
}> {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  return { token, tokenHash: await hashDeviceToken(token) };
}

export const webCryptoDeviceAdapter: DeviceCryptoPort = {
  encrypt: encryptSensitiveText,
  decrypt: decryptSensitiveText,
  hashToken: hashDeviceToken,
  verifyToken: verifyDeviceToken,
  generateToken: generateDeviceToken,
};
