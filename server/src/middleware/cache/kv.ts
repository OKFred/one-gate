/**
 * KV 缓存抽象层
 * API 设计参考 Cloudflare Workers KV，支持内存与 Cloudflare KV 适配
 */

import { createCache, type Cache } from "cache-manager";
import type {
  KVGetOptions,
  KVPutOptions,
  KVListOptions,
  KVListResult,
  CacheStats,
} from "./types";
import { getEnv } from "@/utils/env";

export interface KVNamespace {
  get<T = string>(
    key: string,
    options?: KVGetOptions | "text" | "json" | "arrayBuffer" | "stream"
  ): Promise<T | null>;
  put(
    key: string,
    value: string | object | ArrayBuffer,
    options?: KVPutOptions
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVListOptions): Promise<KVListResult>;
  getStats(): Promise<CacheStats>;
  resetStats(): void;
  clear(): Promise<void>;
}

/**
 * 内存实现的 KV 缓存命名空间（用于本地开发）
 */
export class MemoryKVNamespace implements KVNamespace {
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
    }
  }

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
      // ArrayBuffer 转 base64
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

  async delete(key: string): Promise<void> {
    const fullKey = this.keyPrefix + key;
    await this.cache.del(fullKey);
  }

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

  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  async clear(): Promise<void> {
    await this.cache.clear();
  }
}

/**
 * Cloudflare Workers 原生实现的 KV 缓存命名空间
 */
export class WorkerKVNamespace implements KVNamespace {
  private kv: any; // Cloudflare KVNamespace
  private keyPrefix: string;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(kv: any, namespace: string = "default") {
    this.kv = kv;
    this.keyPrefix = `${namespace}:`;
  }

  async get<T = string>(
    key: string,
    options?: KVGetOptions | "text" | "json" | "arrayBuffer" | "stream"
  ): Promise<T | null> {
    const fullKey = this.keyPrefix + key;

    let type: string = "text";
    if (typeof options === "string") {
      type = options;
    } else if (options?.type) {
      type = options.type;
    }

    let value = null;
    try {
      value = await this.kv.get(fullKey, { 
        type: type === "json" ? "json" : "text",
        cacheTtl: typeof options === "object" ? options.cacheTtl : undefined 
      });
    } catch (e) {
      console.error("WorkerKVNamespace get error", e);
    }

    if (value === null) {
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return value as T;
  }

  async put(
    key: string,
    value: string | object | ArrayBuffer,
    options?: KVPutOptions
  ): Promise<void> {
    const fullKey = this.keyPrefix + key;

    let serializedValue: string | ArrayBuffer;
    if (typeof value === "string" || value instanceof ArrayBuffer) {
      serializedValue = value;
    } else {
      serializedValue = JSON.stringify(value);
    }

    await this.kv.put(fullKey, serializedValue, {
      expiration: options?.expiration,
      expirationTtl: options?.expirationTtl,
      metadata: options?.metadata,
    });
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.keyPrefix + key;
    await this.kv.delete(fullKey);
  }

  async list(options?: KVListOptions): Promise<KVListResult> {
    const prefix = options?.prefix
      ? this.keyPrefix + options.prefix
      : this.keyPrefix;
    
    // Cloudflare limitation: max limit is 1000
    const limit = Math.min(options?.limit || 1000, 1000);

    const result = await this.kv.list({
      prefix,
      limit,
      cursor: options?.cursor,
    });

    const keys = result.keys.map((k: any) => ({
      ...k,
      name: k.name.substring(this.keyPrefix.length),
    }));

    return {
      keys,
      list_complete: result.list_complete,
      cursor: result.cursor,
    };
  }

  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    // To align with Memory implementation, listing up to 1000 keys
    const listResult = await this.list({ limit: 1000 });
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: listResult.keys.length,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  async clear(): Promise<void> {
    let cursor: string | undefined;
    do {
      const result = await this.list({ cursor, limit: 1000 });
      for (const key of result.keys) {
        await this.delete(key.name);
      }
      cursor = result.cursor;
      if (result.list_complete) {
        break;
      }
    } while (cursor);
  }
}

/**
 * 创建 KV 命名空间
 * 根据环境变量中是否有 KV binding 自动选择原生或内存实现
 * 
 * @param namespace - 命名空间名称
 * @param ttlSeconds - 默认 TTL（秒）
 * @returns KV 命名空间实例
 */
export function createKVNamespace(
  namespace: string,
  ttlSeconds?: number
): KVNamespace {
  const kvBinding = getEnv("KV");
  if (kvBinding) {
    return new WorkerKVNamespace(kvBinding, namespace);
  }
  return new MemoryKVNamespace(namespace, ttlSeconds);
}
