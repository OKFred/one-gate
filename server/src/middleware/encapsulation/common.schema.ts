import { JSONSchema } from "json-schema-to-ts";

/**
 * 通用列表请求的基础属性 schema
 * 
 * 包含以下属性：
 * - descend: 是否降序排列
 * - pageNo: 页码（最小值为1，默认为1）
 * - pageSize: 每页数量（最大值为1000，默认为10）
 * - keyword: 关键词搜索
 * 
 * @example
 * ```typescript
 * const listReq = {
 *   type: "object",
 *   properties: {
 *     orderBy: orderByWrapper(["id", "name"]),
 *     ...listReqBase,
 *   },
 *   required: [],
 *   additionalProperties: false,
 * } as const satisfies JSONSchema;
 * ```
 */
export const listReqBase = {
  descend: { type: "boolean" } as const,
  pageNo: { type: "number", minimum: 1, default: 1 } as const,
  pageSize: { type: "number", maximum: 1000, default: 10 } as const,
  keyword: { type: "string", examples: [""] } as const,
} as const;

/**
 * 通用列表响应的基础属性 schema
 * 
 * 包含以下属性：
 * - total: 总记录数
 * - totalPage: 总页数
 * - currentPage: 当前页码
 * - pageSize: 每页记录数
 * 
 * @example
 * ```typescript
 * const listRes = {
 *   type: "object",
 *   properties: {
 *     ...listResBase,
 *     list: listWrapper({...itemProps}),
 *   },
 * } as const satisfies JSONSchema;
 * ```
 */
export const listResBase = {
  total: { type: "number", description: "总记录数" } as const,
  totalPage: { type: "number", description: "总页数" } as const,
  currentPage: { type: "number", description: "当前页码" } as const,
  pageSize: { type: "number", description: "每页记录数" } as const,
} as const;

/**
 * 创建 orderBy 字段的 schema
 * 
 * @param fields - 可排序的字段枚举数组
 * @returns orderBy 字段的 JSON Schema
 * 
 * @example
 * ```typescript
 * orderBy: orderByWrapper(["id", "name", "createTimeUtc"] satisfies (keyof YourType)[])
 * ```
 */
export function orderByWrapper<T extends readonly string[]>(fields: T) {
  return {
    type: "string",
    enum: fields,
  } as const;
}

/**
 * 创建列表项数组的 schema
 * 
 * @param itemProperties - 列表项的属性定义
 * @returns 列表数组的 JSON Schema
 * 
 * @example
 * ```typescript
 * list: listWrapper({
 *   id: { type: "number" },
 *   name: { type: "string" },
 * })
 * ```
 */
export function listWrapper(itemProperties: Record<string, JSONSchema>) {
  return {
    type: "array",
    items: {
      type: "object",
      properties: itemProperties,
    },
  } as const satisfies JSONSchema;
}
