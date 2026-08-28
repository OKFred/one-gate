import {
  TOTP_PERIOD_SECONDS,
  TOTP_WINDOW_STEPS,
  constantTimeEqual,
  isTotpGateSessionClaims,
  type TotpCandidate,
  type TotpGateSessionClaims,
} from "../domain/totp-gate.js";
import type { TotpGateCryptography } from "../application/ports.js";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const SESSION_KEY_LABEL = "hodor:totp-gate:session:v1";
const TOKEN_KEY_LABEL = "hodor:totp-gate:token-binding:v1";
const CLIENT_KEY_LABEL = "hodor:totp-gate:client-binding:v1";

function decodeBase32(value: string): Uint8Array {
  const normalized = value.trim().toUpperCase().replace(/=+$/u, "");
  if (!normalized || !/^[A-Z2-7]+$/u.test(normalized)) {
    throw new Error("TOTP secret is not valid Base32");
  }
  let buffer = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("TOTP secret contains invalid Base32 data");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >>> bits) & 0xff);
    }
  }
  const decoded = Uint8Array.from(bytes);
  if (decoded.byteLength !== 20) {
    throw new Error("TOTP secret must decode to exactly 20 bytes");
  }
  return decoded;
}

function encodeBase64Url(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

async function hmac(
  hash: "SHA-1" | "SHA-256",
  key: Uint8Array,
  value: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, value));
}

async function deriveKey(
  secret: Uint8Array,
  label: string
): Promise<Uint8Array> {
  return await hmac("SHA-256", secret, new TextEncoder().encode(label));
}

async function createTotpCode(
  secret: Uint8Array,
  step: number
): Promise<string> {
  const counter = new Uint8Array(8);
  new DataView(counter.buffer).setBigUint64(0, BigInt(step), false);
  const digest = await hmac("SHA-1", secret, counter);
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export class WebCryptoTotpGateCryptography implements TotpGateCryptography {
  async fingerprint(secret: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", decodeBase32(secret));
    return encodeBase64Url(new Uint8Array(digest)).slice(0, 16);
  }

  async createCandidates(
    secret: string,
    nowMs: number
  ): Promise<readonly TotpCandidate[]> {
    const decoded = decodeBase32(secret);
    const currentStep = Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS);
    const offsets = [0, -TOTP_WINDOW_STEPS, TOTP_WINDOW_STEPS] as const;
    return await Promise.all(
      offsets.map(async (offset) => ({
        step: currentStep + offset,
        code: await createTotpCode(decoded, currentStep + offset),
      }))
    );
  }

  async digestToken(secret: string, token: string): Promise<string> {
    const decoded = decodeBase32(secret);
    const key = await deriveKey(decoded, TOKEN_KEY_LABEL);
    return encodeBase64Url(
      await hmac("SHA-256", key, new TextEncoder().encode(token))
    );
  }

  async digestClient(secret: string, clientIdentity: string): Promise<string> {
    const decoded = decodeBase32(secret);
    const key = await deriveKey(decoded, CLIENT_KEY_LABEL);
    return encodeBase64Url(
      await hmac("SHA-256", key, new TextEncoder().encode(clientIdentity))
    );
  }

  async signSession(
    secret: string,
    claims: TotpGateSessionClaims
  ): Promise<string> {
    const decoded = decodeBase32(secret);
    const key = await deriveKey(decoded, SESSION_KEY_LABEL);
    const payload = encodeBase64Url(
      new TextEncoder().encode(JSON.stringify(claims))
    );
    const signature = encodeBase64Url(
      await hmac("SHA-256", key, new TextEncoder().encode(payload))
    );
    return `${payload}.${signature}`;
  }

  async verifySession(
    secret: string,
    value: string
  ): Promise<TotpGateSessionClaims | undefined> {
    const parts = value.split(".");
    if (parts.length !== 2) return undefined;
    const [payload, signature] = parts;
    const decoded = decodeBase32(secret);
    const key = await deriveKey(decoded, SESSION_KEY_LABEL);
    const expected = encodeBase64Url(
      await hmac("SHA-256", key, new TextEncoder().encode(payload))
    );
    if (!constantTimeEqual(signature, expected)) return undefined;
    try {
      const parsed: unknown = JSON.parse(
        new TextDecoder().decode(decodeBase64Url(payload))
      );
      return isTotpGateSessionClaims(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
}
