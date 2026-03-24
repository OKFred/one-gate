/**
 * 缓存抽象层类型定义
 * API 设计参考 Cloudflare Workers KV
 */

/**
 * KV Get 方法的返回类型
 */
export type KVGetType = "text" | "json" | "arrayBuffer" | "stream";

/**
 * KV Get 方法的选项
 */
export interface KVGetOptions {
  /**
   * 返回类型，默认为 "text"
   */
  type?: KVGetType;
  /**
   * 是否启用缓存穿透（cacheTtl 为 null 时使用）
   */
  cacheTtl?: number | null;
}

/**
 * KV Put 方法的选项
 */
export interface KVPutOptions {
  /**
   * 过期时间（秒）
   * 从当前时间开始计算
   */
  expirationTtl?: number;
  /**
   * 绝对过期时间（Unix 时间戳，秒）
   */
  expiration?: number;
  /**
   * 元数据（可选，用于存储额外信息）
   */
  metadata?: Record<string, unknown>;
}

/**
 * KV List 方法的选项
 */
export interface KVListOptions {
  /**
   * 键名前缀过滤
   */
  prefix?: string;
  /**
   * 限制返回的键数量
   */
  limit?: number;
  /**
   * 游标（用于分页）
   */
  cursor?: string;
}

/**
 * KV List 方法的返回结果
 */
export interface KVListResult {
  /**
   * 键列表
   */
  keys: KVKey[];
  /**
   * 是否还有更多结果
   */
  list_complete: boolean;
  /**
   * 下一页的游标
   */
  cursor?: string;
}

/**
 * KV 键信息
 */
export interface KVKey {
  /**
   * 键名
   */
  name: string;
  /**
   * 过期时间（Unix 时间戳，秒）
   */
  expiration?: number;
  /**
   * 元数据
   */
  metadata?: Record<string, unknown>;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /**
   * 缓存命中次数
   */
  hits: number;
  /**
   * 缓存未命中次数
   */
  misses: number;
  /**
   * 缓存键数量
   */
  keys: number;
  /**
   * 缓存命中率
   */
  hitRate: number;
}
