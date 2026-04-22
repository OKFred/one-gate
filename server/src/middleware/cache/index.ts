/**
 * 缓存抽象层
 * 提供类似 Cloudflare Workers KV 的 API
 */
import { createCache, type Cache } from "cache-manager";
import { getEnv } from "@/utils/env";
import type {
  KVGetOptions,
  KVPutOptions,
  KVListOptions,
  KVListResult,
} from "./types";

/**
 * KV 存储类
 * 封装了对 Cloudflare Workers KV 和 cache-manager 的统一访问
 */
export class KVStorage {
  private cache: Cache | null = null;
  private bindingName: string;
  private ttlSeconds: number;

  constructor(bindingName: string = "KV", ttlSeconds: number = 3600) {
    this.bindingName = bindingName;
    this.ttlSeconds = ttlSeconds;
  }

  /**
   * 获取底层存储执行器
   * 优先使用环境变量中的真实 KV，否则回退到内存缓存
   */
  private getExecutor(): { realKV?: any; cache?: Cache } {
    // 尝试从环境变量获取真实的 KV 绑定
    const envKV = getEnv(this.bindingName);

    if (
      envKV &&
      typeof (envKV as any)?.get === "function" &&
      typeof (envKV as any)?.put === "function"
    ) {
      console.log({ KV_KEY: this.bindingName, MSG: "KV_IN_USE" });
      return { realKV: envKV };
    }

    // 如果没有真实 KV，回退到 cache-manager (内存)
    if (!this.cache) {
      this.cache = createCache({
        ttl: this.ttlSeconds * 1000,
      });
    }

    return { cache: this.cache };
  }

  /**
   * 获取缓存值
   */
  async get<T = string>(
    key: string,
    options?: KVGetOptions | "text" | "json" | "arrayBuffer" | "stream"
  ): Promise<T | null> {
    const { realKV, cache } = this.getExecutor();
    let value: any;

    if (realKV) {
      value = await realKV.get(key, options);
    } else if (cache) {
      value = await cache.get<string>(key);
    }

    if (value === undefined || value === null) {
      return null;
    }

    // 如果是真实 KV，它已经处理好了类型转换
    if (realKV) return value;

    // 处理 cache-manager 的类型参数
    let type: string = "text";
    if (typeof options === "string") {
      type = options;
    } else if (options?.type) {
      type = options.type;
    }

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
    }
  }

  /**
   * 设置缓存值
   */
  async put(
    key: string,
    value: string | object | ArrayBuffer,
    options?: KVPutOptions
  ): Promise<void> {
    const { realKV, cache } = this.getExecutor();

    if (realKV) {
      await realKV.put(key, value, options);
      return;
    }

    if (cache) {
      // 处理不同类型的值 (用于内存缓存)
      let serializedValue: string;
      if (typeof value === "string") {
        serializedValue = value;
      } else if (value instanceof ArrayBuffer) {
        serializedValue = Buffer.from(value).toString("base64");
      } else {
        serializedValue = JSON.stringify(value);
      }

      // 计算 TTL (毫秒)
      let ttl: number | undefined;
      if (options?.expirationTtl !== undefined) {
        ttl = options.expirationTtl * 1000;
      } else if (options?.expiration !== undefined) {
        const now = Math.floor(Date.now() / 1000);
        ttl = (options.expiration - now) * 1000;
        if (ttl <= 0) return;
      }

      await cache.set(key, serializedValue, ttl);
    }
  }

  /**
   * 删除缓存值
   */
  async delete(key: string): Promise<void> {
    const { realKV, cache } = this.getExecutor();

    if (realKV) {
      await realKV.delete(key);
    } else if (cache) {
      await cache.del(key);
    }
  }

  /**
   * 列出缓存键
   */
  async list(options?: KVListOptions): Promise<KVListResult> {
    const { realKV, cache } = this.getExecutor();

    if (realKV) {
      return await realKV.list(options);
    }

    const keys: { name: string }[] = [];
    const prefix = options?.prefix || "";
    const limit = options?.limit || 1000;

    if (cache) {
      try {
        const store = (cache as any).stores?.[0];
        if (store?.iterator) {
          let count = 0;
          for await (const [key] of store.iterator({})) {
            if (key.startsWith(prefix)) {
              keys.push({ name: key });
              count++;
              if (count >= limit) break;
            }
          }
        }
      } catch (error) {
        console.warn("Iterator not supported or error occurred:", error);
      }
    }

    return {
      keys,
      list_complete: keys.length < limit,
    };
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    const { realKV, cache } = this.getExecutor();

    if (realKV) {
      // CF Workers KV 不支持直接 clear，需要分页列出并删除
      let list = await realKV.list();
      while (list.keys.length > 0) {
        await Promise.all(list.keys.map((k: any) => realKV.delete(k.name)));
        if (list.list_complete) break;
        list = await realKV.list({ cursor: list.cursor });
      }
    } else if (cache) {
      await cache.clear();
    }
  }
}

/**
 * 创建或获取 KV 存储实例
 */
export function getKVStorage(
  bindingName: string = "KV",
  ttlSeconds?: number
): KVStorage {
  return new KVStorage(bindingName, ttlSeconds);
}

/**
 * 全局统一的 KV 存储实例
 */
export const kv = getKVStorage("KV");
