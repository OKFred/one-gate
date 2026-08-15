import { getEnv } from "@hodor/core/utils/env";
import type { OAuthCipherPort } from "../application/ports.js";

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
  const raw = getEnv("OAUTH_SENSITIVE_DATA_KEY");
  if (!raw) throw new Error("OAUTH_SENSITIVE_DATA_KEY is required");
  const keyBytes = fromBase64(raw.trim());
  if (keyBytes.byteLength !== 32) {
    throw new Error("OAUTH_SENSITIVE_DATA_KEY must decode to 32 bytes");
  }
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export const webCryptoOAuthCipher: OAuthCipherPort = {
  async encrypt(plaintext, aad) {
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
    return `${CIPHER_VERSION}.${toBase64Url(iv)}.${toBase64Url(
      new Uint8Array(encrypted)
    )}`;
  },
  async decrypt(ciphertext, aad) {
    const [version, ivText, encryptedText, extra] = ciphertext.split(".");
    if (version !== CIPHER_VERSION || !ivText || !encryptedText || extra) {
      throw new Error("Unsupported OAuth ciphertext format");
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
  },
};
