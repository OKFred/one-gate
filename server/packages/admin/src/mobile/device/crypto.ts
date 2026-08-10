import { getEnv } from "@hodor/core/utils/env";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const CIPHER_VERSION = "v1";

/** 将字节编码为无填充 Base64URL。 */
function toBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/** 解码 Base64 或 Base64URL。 */
function fromBase64(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** 读取并校验 AES-256-GCM 密钥，禁止缺失时降级。 */
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

/** 使用 AES-256-GCM 加密 UTF-8 文本，并绑定字段级 AAD。 */
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

/** 解密本服务生成的 AES-256-GCM 文本。 */
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

/** 对上报令牌计算 SHA-256 摘要。 */
export async function hashDeviceToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return toBase64Url(new Uint8Array(digest));
}

/** 常量时间比较设备令牌与数据库摘要。 */
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

/** 生成只展示一次的设备上报令牌及其摘要。 */
export async function generateDeviceToken(): Promise<{
  token: string;
  tokenHash: string;
}> {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  return { token, tokenHash: await hashDeviceToken(token) };
}

/** 仅保留标识尾四位，其他字符统一遮罩。 */
export function maskIdentifier(value: string): string {
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.min(12, value.length - 4))}${value.slice(-4)}`;
}
