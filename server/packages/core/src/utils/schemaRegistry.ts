/**
 * 全局 Schema 注册中心
 *
 * 在 encapsulation 注册 OpenAPI component 时同步收集 schema 定义，
 * 供后续同步到 system_schema_form 数据库表使用。
 */

const schemaStore = new Map<string, object>();
let cachedVersionHash: string | null = null;

/**
 * 注册一个 schema 到全局收集器
 */
export function registerSchema(name: string, schema: object): void {
  schemaStore.set(name, schema);
  cachedVersionHash = null; // 标记需要重新计算版本号
}

/**
 * 按名称批量获取 schema
 */
export function getSchemas(
  names: string[]
): Record<string, object | undefined> {
  const result: Record<string, object | undefined> = {};
  for (const name of names) {
    result[name] = schemaStore.get(name);
  }
  return result;
}

/**
 * 获取所有已注册的 schema
 */
export function getAllSchemas(): Map<string, object> {
  return schemaStore;
}

/**
 * 简单的字符串哈希（djb2 变体），兼容 Node.js 和 Cloudflare Workers
 */
function simpleHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash.toString(36);
}

/**
 * 计算当前所有 schema 的全局版本哈希
 * 基于所有 schema key + value 的排序后摘要
 */
export function getVersionHash(): string {
  if (cachedVersionHash) return cachedVersionHash;

  const keys = Array.from(schemaStore.keys()).sort();
  let combined = "";
  for (const key of keys) {
    combined += key + JSON.stringify(schemaStore.get(key));
  }
  cachedVersionHash = simpleHash(combined);
  return cachedVersionHash;
}
