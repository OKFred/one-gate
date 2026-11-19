import type { JSONSchema } from "json-schema-to-ts";

export const listAllReqBase = {
  descend: {
    type: "boolean",
    description: "是否降序",
  } as const,
} as const;

export const keywordReqBase = {
  keyword: {
    type: "string",
    examples: [""],
    description: "关键词",
  } as const,
} as const;

const paginationReqBase = {
  pageNo: {
    type: "number",
    minimum: 1,
    default: 1,
    description: "页码",
  } as const,
  pageSize: {
    type: "number",
    minimum: 1,
    maximum: 1000,
    default: 10,
    description: "每页记录数",
  } as const,
} as const;

export const listReqBase = {
  ...listAllReqBase,
  ...keywordReqBase,
  ...paginationReqBase,
} as const;

export const listResBase = {
  total: { type: "number", description: "总记录数" } as const,
  totalPage: { type: "number", description: "总页数" } as const,
  currentPage: { type: "number", description: "当前页码" } as const,
  pageSize: { type: "number", description: "每页记录数" } as const,
} as const;

export function orderByWrapper<T extends readonly string[]>(fields: T) {
  return {
    type: "string",
    enum: fields,
  } as const;
}

export function listWrapper<
  TReq extends readonly string[] = readonly string[],
  TProps extends Record<string, JSONSchema> = Record<string, JSONSchema>,
>(itemProperties: TProps, requiredKeys: TReq = [] as unknown as TReq) {
  return {
    type: "array",
    minItems: 0,
    items: {
      type: "object",
      properties: itemProperties,
      required: requiredKeys,
      additionalProperties: false,
    },
  } as const;
}

export function listRequestWrapper<
  T extends readonly string[],
  TOther extends Record<string, JSONSchema> = Record<string, JSONSchema>,
>(orderByFields: T, otherProps: TOther = {} as TOther) {
  return {
    type: "object",
    properties: {
      orderBy: orderByWrapper<T>(orderByFields),
      ...listReqBase,
      ...otherProps,
    },
    required: [],
    additionalProperties: false,
  } as const;
}

export function listResponseWrapper<
  TReq extends readonly string[] = readonly string[],
  TProps extends Record<string, JSONSchema> = Record<string, JSONSchema>,
>(itemProperties: TProps, requiredKeys: TReq = [] as unknown as TReq) {
  return {
    type: "object",
    properties: {
      ...listResBase,
      list: listWrapper<TReq, TProps>(itemProperties, requiredKeys),
    },
    required: [
      "total",
      "totalPage",
      "currentPage",
      "pageSize",
      "list",
    ] as const,
    additionalProperties: false,
  } as const;
}
