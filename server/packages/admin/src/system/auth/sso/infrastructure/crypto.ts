import { getEnv } from "@hodor/core/utils/env";
import type {
  SsoCipherPort,
  SsoHashPort,
  SsoRandomPort,
} from "../application/ports.js";

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
    throw new Error("SSO ciphertext contains invalid base64url data");
  }
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeSensitiveKey(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/u.test(value)) {
    throw new Error("OAUTH_SENSITIVE_DATA_KEY is not valid base64");
  }
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importSensitiveKey(): Promise<CryptoKey> {
  const raw = getEnv("OAUTH_SENSITIVE_DATA_KEY")?.trim();
  if (!raw) throw new Error("OAUTH_SENSITIVE_DATA_KEY is required");
  const keyBytes = decodeSensitiveKey(raw);
  if (keyBytes.byteLength !== 32) {
    throw new Error("OAUTH_SENSITIVE_DATA_KEY must decode to 32 bytes");
  }
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export const webCryptoSsoRandom: SsoRandomPort = {
  randomBase64Url(byteLength) {
    if (!Number.isInteger(byteLength) || byteLength < 1 || byteLength > 1024) {
      throw new Error("SSO random byte length is invalid");
    }
    return toBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
  },
};

export const webCryptoSsoHash: SsoHashPort = {
  async sha256Base64Url(value) {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
    return toBase64Url(new Uint8Array(digest));
  },
};

export const webCryptoSsoCipher: SsoCipherPort = {
  async encrypt(plaintext, aad) {
    const key = await importSensitiveKey();
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
      throw new Error("Unsupported SSO ciphertext format");
    }
    const iv = fromBase64Url(ivText);
    if (iv.byteLength !== AES_GCM_IV_BYTES) {
      throw new Error("SSO ciphertext IV is invalid");
    }
    const key = await importSensitiveKey();
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
