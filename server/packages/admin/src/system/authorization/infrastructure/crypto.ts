import { getEnv } from "@hodor/core/utils/env";
import type { AuthorizationCredentialCipherPort } from "../application/ports.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const CIPHER_VERSION = "v1";
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BITS = 128;

function toBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error("Authorization ciphertext contains invalid base64url data");
  }
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeMasterKey(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/u.test(value)) {
    throw new Error("HODOR_AUTH_MASTER_KEY is not valid base64");
  }
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importMasterKey(): Promise<CryptoKey> {
  const raw = getEnv("HODOR_AUTH_MASTER_KEY")?.trim();
  if (!raw) throw new Error("HODOR_AUTH_MASTER_KEY is required");
  const bytes = decodeMasterKey(raw);
  if (bytes.byteLength !== 32) {
    throw new Error("HODOR_AUTH_MASTER_KEY must decode to 32 bytes");
  }
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export const webCryptoAuthorizationCipher: AuthorizationCredentialCipherPort = {
  async encrypt(plaintext, aad) {
    const key = await importMasterKey();
    const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: encoder.encode(aad),
        tagLength: AES_GCM_TAG_BITS,
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
      throw new Error("Unsupported Authorization ciphertext format");
    }
    const iv = fromBase64Url(ivText);
    if (iv.byteLength !== AES_GCM_IV_BYTES) {
      throw new Error("Authorization ciphertext IV is invalid");
    }
    const key = await importMasterKey();
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: encoder.encode(aad),
        tagLength: AES_GCM_TAG_BITS,
      },
      key,
      fromBase64Url(encryptedText)
    );
    return decoder.decode(decrypted);
  },
};
