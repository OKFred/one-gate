/**
 * 缓存抽象层
 * 提供类似 Cloudflare Workers KV 的 API，便于后续迁移
 */

import { KVNamespace, createKVNamespace as _createKVNamespace } from "./kv";

/**
 * 自定义命名空间注册表
 */
const customNamespaces = new Map<string, KVNamespace>();

/**
 * 创建并注册命名空间
 */
export function createKVNamespace(
  namespace: string,
  defaultTTL?: number
): KVNamespace {
  if (!customNamespaces.has(namespace)) {
    const kv = _createKVNamespace(namespace, defaultTTL);
    customNamespaces.set(namespace, kv);
  }
  return customNamespaces.get(namespace)!;
}

/**
 * 获取已注册的自定义缓存命名空间
 */
export function getKVNamespace(namespace: string): KVNamespace | null {
  return customNamespaces.get(namespace) || null;
}

/**
 * 预定义的缓存命名空间
 */
export class CacheNamespaces {
  /**
   * 多语言翻译缓存
   * 用于缓存多语言文案
   */
  static readonly I18nTranslation = createKVNamespace("i18n_translation");
}

// 导出类型和工具
export { KVNamespace } from "./kv";
export type {
  KVGetOptions,
  KVPutOptions,
  KVListOptions,
  KVListResult,
  KVKey,
  CacheStats,
} from "./types";
