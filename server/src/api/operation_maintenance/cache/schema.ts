import type { JSONSchema } from "json-schema-to-ts";

/**
 * 命名空间信息 VO
 */
export const NamespaceVO = {
  name: {
    type: "string",
    description: "命名空间名称",
    examples: ["i18n_translation", "user_session", "data_permission"],
    maxLength: 100,
  },
  keyCount: {
    type: "number",
    description: "缓存键数量",
    examples: [1250, 42],
  },
  expirationTtl: {
    type: ["number", "null"],
    nullable: true,
    description: "过期时间（秒）",
    examples: [3600, 1800],
  },
} as const satisfies Record<string, JSONSchema>;

/**
 * 缓存键 VO
 */
export const CacheKeyVO = {
  name: {
    type: "string",
    description: "缓存键名",
    examples: ["zh-CN:common.save", "user:12345", "dept:1:data"],
    maxLength: 500,
  },
} as const satisfies Record<string, JSONSchema>;

/**
 * 获取缓存值响应 VO
 */
export const GetValueVO = {
  value: {
    description: "缓存值（可以是任意 JSON 可序列化数据）",
    examples: ["保存", { userId: 12345, username: "admin" }],
  },
  exists: {
    type: "boolean",
    description: "缓存键是否存在",
    examples: [true, false],
  },
} as const satisfies Record<string, JSONSchema>;

/**
 * 缓存统计 VO
 */
export const StatsVO = {
  hits: {
    type: "number",
    description: "缓存命中次数",
    examples: [15420, 0],
  },
  misses: {
    type: "number",
    description: "缓存未命中次数",
    examples: [83, 0],
  },
  keys: {
    type: "number",
    description: "缓存键总数",
    examples: [1250, 0],
  },
  hitRate: {
    type: "string",
    description: "缓存命中率",
    examples: ["99.46%", "0.00%"],
    pattern: "^\\d+\\.\\d{2}%$",
  },
} as const satisfies Record<string, JSONSchema>;

/**
 * 公共请求参数字段
 */
export const RequestParamFields = {
  namespace: {
    type: "string",
    description: "缓存命名空间名称",
    examples: ["i18n_translation", "user_session"],
    minLength: 1,
    maxLength: 100,
  },
  key: {
    type: "string",
    description: "缓存键名",
    examples: ["zh-CN:common.save", "user:12345"],
    minLength: 1,
    maxLength: 500,
  },
  prefix: {
    type: "string",
    description: "键名前缀过滤",
    examples: ["zh-CN:", "user:", "dept:1:"],
    maxLength: 200,
  },
  limit: {
    type: "number",
    description: "返回结果数量限制",
    examples: [100, 1000],
    minimum: 1,
    maximum: 1000,
  },
  type: {
    type: "string",
    description: "值类型",
    enum: ["text", "json"],
    examples: ["json", "text"],
  },
  value: {
    description: "缓存值（任意 JSON 可序列化数据）",
    examples: ["保存", { userId: 12345 }, [1, 2, 3], 42],
  },
  expirationTtl: {
    type: ["number", "null"],
    nullable: true,
    description: "过期时间（秒），从当前时间开始计算",
    examples: [3600, 1800, 300],
    minimum: 1,
  },
} as const satisfies Record<string, JSONSchema>;

/**
 * 公共响应字段
 */
export const ResponseFields = {
  success: {
    type: "boolean",
    description: "操作是否成功",
    examples: [true],
  },
  list_complete: {
    type: "boolean",
    description: "列表是否完整（所有结果已返回）",
    examples: [true, false],
  },
} as const satisfies Record<string, JSONSchema>;
