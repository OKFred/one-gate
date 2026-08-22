import { DeviceRuleViolation } from "./device.js";

export type MetadataPrimitive = string | number | boolean;
export type MetadataValue = MetadataPrimitive | MetadataValue[];
export type ReportedMetadataValue =
  | MetadataPrimitive
  | null
  | ReportedMetadataValue[]
  | { [key: string]: ReportedMetadataValue };

export interface CustomMetadataEntry {
  value: MetadataValue;
  sensitive: boolean;
}

export type CustomMetadata = Record<string, CustomMetadataEntry>;
export type ReportedExtra = Record<string, ReportedMetadataValue>;

export const SENSITIVE_METADATA_PLACEHOLDER = "••••••";

const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const MAX_KEYS = 50;
const MAX_BYTES = 32 * 1024;
const MAX_DEPTH = 3;
const FORBIDDEN_REPORTED_KEYS = new Set([
  "clientid",
  "deviceid",
  "manufacturer",
  "brand",
  "model",
  "androidversion",
  "androidsdk",
  "autojs6version",
  "clientversion",
  "protocolversion",
  "batterylevel",
  "ischarging",
  "networkconnected",
  "networktype",
  "capabilities",
  "isonline",
  "onlinestatus",
  "reportedstatus",
  "imei",
  "imeis",
  "serial",
  "serialnumber",
  "token",
  "reporttoken",
  "phonenumber",
  "mobile",
]);
const SENSITIVE_KEY_FRAGMENT =
  /(imei|serial|token|password|secret|phone|mobile|msisdn|iccid|imsi)/i;

function fail(message: string): never {
  throw new DeviceRuleViolation(message);
}

/** 判断值是否为普通对象。 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 验证扩展值的类型、深度和累计键数。 */
function validateValue(
  value: unknown,
  depth: number
): asserts value is MetadataValue {
  if (depth > MAX_DEPTH) fail("Metadata nesting exceeds depth 3");
  if (typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("Metadata number must be finite");
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) validateValue(item, depth + 1);
    return;
  }
  fail("Unsupported metadata value type");
}

function validateReportedKey(key: string): void {
  if (!KEY_PATTERN.test(key)) fail(`Invalid metadata key: ${key}`);
  const compact = key.replace(/[_.-]/g, "").toLowerCase();
  if (
    FORBIDDEN_REPORTED_KEYS.has(compact) ||
    SENSITIVE_KEY_FRAGMENT.test(key)
  ) {
    fail(`Sensitive or reserved reportedExtra key: ${key}`);
  }
}

/** reportedExtra 允许有限深度的普通对象，并递归执行键名安全检查。 */
function validateReportedValue(
  value: unknown,
  depth: number,
  keyCounter: { value: number }
): asserts value is ReportedMetadataValue {
  if (depth > MAX_DEPTH) fail("Metadata nesting exceeds depth 3");
  if (value === null) return;
  if (typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("Metadata number must be finite");
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      validateReportedValue(item, depth + 1, keyCounter);
    }
    return;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      validateReportedKey(key);
      keyCounter.value += 1;
      if (keyCounter.value > MAX_KEYS) fail("Metadata exceeds 50 keys");
      validateReportedValue(child, depth + 1, keyCounter);
    }
    return;
  }
  fail("Unsupported metadata value type");
}

/** 验证上报扩展信息，并拒绝正式字段与敏感语义键。 */
export function validateReportedExtra(value: unknown): ReportedExtra {
  if (!isRecord(value)) fail("reportedExtra must be an object");
  const result: ReportedExtra = {};
  const keyCounter = { value: 0 };
  for (const [key, child] of Object.entries(value)) {
    validateReportedKey(key);
    keyCounter.value += 1;
    if (keyCounter.value > MAX_KEYS) fail("Metadata exceeds 50 keys");
    validateReportedValue(child, 1, keyCounter);
    result[key] = child;
  }
  assertSerializedSize(value);
  return result;
}

/** 验证管理员自定义元数据结构。 */
export function validateCustomMetadata(value: unknown): CustomMetadata {
  if (!isRecord(value)) fail("customMetadata must be an object");
  const result: CustomMetadata = {};
  let keyCount = 0;
  for (const [key, entry] of Object.entries(value)) {
    if (!KEY_PATTERN.test(key)) fail(`Invalid metadata key: ${key}`);
    if (!isRecord(entry) || typeof entry.sensitive !== "boolean") {
      fail(`Invalid custom metadata entry: ${key}`);
    }
    if (SENSITIVE_KEY_FRAGMENT.test(key) && !entry.sensitive) {
      fail(`Sensitive custom metadata key must be encrypted: ${key}`);
    }
    keyCount += 1;
    if (keyCount > MAX_KEYS) fail("Metadata exceeds 50 keys");
    validateValue(entry.value, 1);
    result[key] = { value: entry.value, sensitive: entry.sensitive };
  }
  assertSerializedSize(value);
  return result;
}

function assertSerializedSize(value: unknown): void {
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_BYTES) {
    fail("Metadata exceeds 32 KiB");
  }
}

/** 安全解析数据库 JSON；历史脏值退化为空对象。 */
export function parseJsonRecord(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** 拆分普通与敏感自定义字段。 */
export function splitCustomMetadata(metadata: CustomMetadata): {
  plain: CustomMetadata;
  sensitive: CustomMetadata;
} {
  const plain: CustomMetadata = {};
  const sensitive: CustomMetadata = {};
  for (const [key, entry] of Object.entries(metadata)) {
    (entry.sensitive ? sensitive : plain)[key] = entry;
  }
  return { plain, sensitive };
}

/** 合并列表可见的普通值和敏感占位符。 */
export function maskCustomMetadata(
  plain: Record<string, unknown>,
  sensitiveKeys: string[]
): Record<string, unknown> {
  const result = { ...plain };
  for (const key of sensitiveKeys) {
    result[key] = { value: SENSITIVE_METADATA_PLACEHOLDER, sensitive: true };
  }
  return result;
}
