/**
 * KV 缓存抽象层
 * API 设计参考 Cloudflare Workers KV，便于后续迁移到 CF Workers
 */

import { createCache, type Cache } from "cache-manager";
import type {
  KVGetOptions,
  KVPutOptions,
  KVListOptions,
  KVListResult,
  CacheStats,
} from "./types";

/**
 * KV 缓存命名空间
 * 类似 Cloudflare Workers 的 KVNamespace
 */
export class KVNamespace {
  private cache: Cache;
  private keyPrefix: string;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(namespace: string = "default", ttlSeconds: number = 3600) {
    this.keyPrefix = `${namespace}:`;
    // cache-manager v7 默认使用内存存储
    this.cache = createCache({
      ttl: ttlSeconds * 1000, // 默认 TTL（毫秒）
    });
  }

  /**
   * 获取缓存值
   * @param key - 键名
   * @param options - 获取选项
   * @returns 缓存值，不存在时返回 null
   */
  async get<T = string>(
    key: string,
    options?: KVGetOptions | "text" | "json" | "arrayBuffer" | "stream"
  ): Promise<T | null> {
    const fullKey = this.keyPrefix + key;
    const value = await this.cache.get<string>(fullKey);

    if (value === undefined || value === null) {
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;

    // 处理类型参数
    let type: string = "text";
    if (typeof options === "string") {
      type = options;
    } else if (options?.type) {
      type = options.type;
    }

    // 根据类型返回不同格式
    switch (type) {
      case "json":
        try {
          return JSON.parse(value as string) as T;
        } catch {
          return null;
        }
      case "text":
      default:
        return value as T;
      // 注意：arrayBuffer 和 stream 在内存缓存中暂不支持
      // 迁移到 CF Workers 时会自动支持
    }
  }

  /**
   * 设置缓存值
   * @param key - 键名
   * @param value - 缓存值
   * @param options - 设置选项
   */
  async put(
    key: string,
    value: string | object | ArrayBuffer,
    options?: KVPutOptions
  ): Promise<void> {
    const fullKey = this.keyPrefix + key;

    // 处理不同类型的值
    let serializedValue: string;
    if (typeof value === "string") {
      serializedValue = value;
    } else if (value instanceof ArrayBuffer) {
      // ArrayBuffer 转 base64（迁移到 CF Workers 时会自动支持原生）
      serializedValue = Buffer.from(value).toString("base64");
    } else {
      serializedValue = JSON.stringify(value);
    }

    // 计算 TTL（毫秒）
    let ttl: number | undefined;
    if (options?.expirationTtl !== undefined) {
      ttl = options.expirationTtl * 1000;
    } else if (options?.expiration !== undefined) {
      const now = Math.floor(Date.now() / 1000);
      ttl = (options.expiration - now) * 1000;
      if (ttl <= 0) {
        // 已过期，不设置
        return;
      }
    }

    await this.cache.set(fullKey, serializedValue, ttl);
  }

  /**
   * 删除缓存值
   * @param key - 键名
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.keyPrefix + key;
    await this.cache.del(fullKey);
  }

  /**
   * 列出缓存键（支持迭代）
   * @param options - 列出选项
   */
  async list(options?: KVListOptions): Promise<KVListResult> {
    const keys: { name: string }[] = [];
    const prefix = options?.prefix
      ? this.keyPrefix + options.prefix
      : this.keyPrefix;
    const limit = options?.limit || 1000;

    try {
      // 使用 cache.stores[0] 访问底层的 Keyv store
      const store = (this.cache as any).stores?.[0];
      if (store?.iterator) {
        let count = 0;
        for await (const [key] of store.iterator({
          namespace: "", // 空字符串以获取所有键
        })) {
          // 过滤命名空间前缀
          if (key.startsWith(prefix)) {
            const name = key.substring(this.keyPrefix.length);
            keys.push({ name });
            count++;
            if (count >= limit) break;
          }
        }
      }
    } catch (error) {
      console.warn("Iterator not supported or error occurred:", error);
    }

    return {
      keys,
      list_complete: keys.length < limit,
    };
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    const listResult = await this.list({ limit: 10000 });
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: listResult.keys.length,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * 清空命名空间下的所有缓存
   */
  async clear(): Promise<void> {
    await this.cache.clear();
  }
}

/**
 * 创建 KV 命名空间
 * @param namespace - 命名空间名称
 * @param ttlSeconds - 默认 TTL（秒）
 * @returns KV 命名空间实例
 */
export function createKVNamespace(
  namespace: string,
  ttlSeconds?: number
): KVNamespace {
  return new KVNamespace(namespace, ttlSeconds);
}
