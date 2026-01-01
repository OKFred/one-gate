import { JSONSchema } from "json-schema-to-ts";

export const listReqBase = {
  descend: { type: "boolean" } as const,
  pageNo: { type: "number", minimum: 1, default: 1 } as const,
  pageSize: { type: "number", minimum: 1, maximum: 1000, default: 10 } as const,
  keyword: { type: "string", examples: [""] } as const,
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

export function listWrapper<T extends readonly string[]>(
  itemProperties: Record<string, JSONSchema>,
  requiredKeys: T = [] as unknown as T
) {
  return {
    oneOf: [
      {
        type: "array",
        items: {
          type: "object",
          properties: {
            ...itemProperties,
          },
          required: [...requiredKeys],
          additionalProperties: false,
        },
      },
      {
        type: "array",
        maxItems: 0,
      },
    ],
  } as const satisfies JSONSchema;
}

export function listRequestWrapper<T extends readonly string[]>(
  orderByFields: T,
  otherProps: Record<string, JSONSchema> = {}
) {
  return {
    type: "object",
    properties: {
      orderBy: orderByWrapper<T>(orderByFields),
      ...listReqBase,
      ...otherProps,
    },
    required: [],
    additionalProperties: false,
  } as const satisfies JSONSchema;
}

export function listResponseWrapper<T extends readonly string[]>(
  itemProperties: Record<string, JSONSchema>,
  requiredKeys: T = [] as unknown as T
) {
  return {
    type: "object",
    properties: {
      ...listResBase,
      list: listWrapper<T>(itemProperties, requiredKeys),
    },
    required: ["total", "totalPage", "currentPage", "pageSize", "list"],
    additionalProperties: false,
  } as const satisfies JSONSchema;
}
