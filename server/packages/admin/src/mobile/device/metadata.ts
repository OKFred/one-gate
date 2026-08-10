export type MetadataPrimitive = string | number | boolean;
export type MetadataValue = MetadataPrimitive | MetadataValue[];

export interface CustomMetadataEntry {
  value: MetadataValue;
  sensitive: boolean;
}

export type CustomMetadata = Record<string, CustomMetadataEntry>;
export type ReportedExtra = Record<string, MetadataValue>;

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

/** 判断值是否为普通对象。 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 验证扩展值的类型、深度和累计键数。 */
function validateValue(
  value: unknown,
  depth: number
): asserts value is MetadataValue {
  if (depth > MAX_DEPTH) throw new Error("Metadata nesting exceeds depth 3");
  if (typeof value === "string" || typeof value === "boolean") {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("Metadata number must be finite");
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) validateValue(item, depth + 1);
    return;
  }
  throw new Error("Unsupported metadata value type");
}

/** 验证上报扩展信息，并拒绝正式字段与敏感语义键。 */
export function validateReportedExtra(value: unknown): ReportedExtra {
  if (!isRecord(value)) throw new Error("reportedExtra must be an object");
  const state = { keyCount: 0 };
  for (const [key, child] of Object.entries(value)) {
    if (!KEY_PATTERN.test(key)) throw new Error(`Invalid metadata key: ${key}`);
    const compact = key.replace(/[_.-]/g, "").toLowerCase();
    if (
      FORBIDDEN_REPORTED_KEYS.has(compact) ||
      SENSITIVE_KEY_FRAGMENT.test(key)
    ) {
      throw new Error(`Sensitive or reserved reportedExtra key: ${key}`);
    }
    state.keyCount += 1;
    if (state.keyCount > MAX_KEYS) throw new Error("Metadata exceeds 50 keys");
    validateValue(child, 1);
  }
  assertSerializedSize(value);
  return value as ReportedExtra;
}

/** 验证管理员自定义元数据结构。 */
export function validateCustomMetadata(value: unknown): CustomMetadata {
  if (!isRecord(value)) throw new Error("customMetadata must be an object");
  const result: CustomMetadata = {};
  const state = { keyCount: 0 };
  for (const [key, entry] of Object.entries(value)) {
    if (!KEY_PATTERN.test(key)) throw new Error(`Invalid metadata key: ${key}`);
    if (!isRecord(entry) || typeof entry.sensitive !== "boolean") {
      throw new Error(`Invalid custom metadata entry: ${key}`);
    }
    if (SENSITIVE_KEY_FRAGMENT.test(key) && !entry.sensitive) {
      throw new Error(
        `Sensitive custom metadata key must be encrypted: ${key}`
      );
    }
    state.keyCount += 1;
    if (state.keyCount > MAX_KEYS) throw new Error("Metadata exceeds 50 keys");
    validateValue(entry.value, 1);
    result[key] = { value: entry.value, sensitive: entry.sensitive };
  }
  assertSerializedSize(value);
  return result;
}

/** 校验 JSON 的 UTF-8 序列化大小。 */
function assertSerializedSize(value: unknown): void {
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_BYTES) {
    throw new Error("Metadata exceeds 32 KiB");
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
    result[key] = { value: "••••••", sensitive: true };
  }
  return result;
}
