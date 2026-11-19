import type { ConditionSpec, JsonPrimitive, MuiColor } from '@hodor/contracts/types';

/** 按点路径读取对象深层属性值（如 `configValue.cfAccountId` 或 `Spec.Name`）。 */
export function getValueByPath(source: unknown, path: string): unknown {
  if (!source || typeof source !== 'object') return undefined;
  const parts = path.split('.');
  let current: unknown = source;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** 根据 `${path}` 模板占位符从记录中插值字符串。 */
export function interpolateTemplate(template: string, row: unknown): string {
  return template.replace(/\$\{([^}]+)\}/g, (_match, expr: string) => {
    const val = getValueByPath(row, expr.trim());
    return val === null || val === undefined ? '' : String(val);
  });
}

/** 将声明式 payloadMap（如 `{ accountId: "$row.id" }`）求值为实际请求体。 */
export function resolvePayloadMap(
  payloadMap: Readonly<Record<string, JsonPrimitive>> | undefined,
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (!payloadMap) {
    return { id: row.id };
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(payloadMap)) {
    if (typeof val === 'string' && val.startsWith('$row.')) {
      result[key] = getValueByPath(row, val.slice(5));
    } else {
      result[key] = val;
    }
  }
  return result;
}

/** 评估纯数据条件表达式（无任意脚本求值）。 */
export function evaluateCondition(
  condition: ConditionSpec | undefined,
  record: Record<string, unknown>,
  isEdit: boolean,
): boolean {
  if (condition === undefined) return true;
  if (condition === 'add') return !isEdit;
  if (condition === 'edit') return isEdit;

  if ('all' in condition) {
    return condition.all.every((sub) => evaluateCondition(sub, record, isEdit));
  }
  if ('any' in condition) {
    return condition.any.some((sub) => evaluateCondition(sub, record, isEdit));
  }
  if ('not' in condition) {
    return !evaluateCondition(condition.not, record, isEdit);
  }

  const val = getValueByPath(record, condition.field);
  if (condition.equals !== undefined) {
    return val === condition.equals;
  }
  if (condition.notEquals !== undefined) {
    return val !== condition.notEquals;
  }
  if (condition.truthy) {
    return Boolean(val);
  }
  if (condition.falsy) {
    return !val;
  }
  if (condition.in) {
    return condition.in.includes(val as JsonPrimitive);
  }
  return Boolean(val);
}

const HASH_COLORS: readonly Exclude<MuiColor, 'default'>[] = [
  'primary',
  'secondary',
  'error',
  'info',
  'success',
  'warning',
];

export function resolveColorHash(input: string): MuiColor {
  if (!input) return 'default';
  return HASH_COLORS[input.charCodeAt(0) % HASH_COLORS.length];
}

export function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseJsonStringArray(raw: unknown, fallback: readonly string[] = []): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item));
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.map((item) => String(item));
    } catch {
      return [...fallback];
    }
  }
  return [...fallback];
}

export function parseJsonNumberArray(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => Number(item)).filter((n) => Number.isFinite(n));
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => Number(item)).filter((n) => Number.isFinite(n));
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
