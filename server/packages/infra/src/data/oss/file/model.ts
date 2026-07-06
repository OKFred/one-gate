import { type JSONSchema } from "json-schema-to-ts";

const OSSFileBaseVO = {
  key: { type: "string", description: "文件路径/键名" },
  size: { type: "number", description: "文件大小 (字节)" },
  lastModified: { type: "string", description: "最后修改时间" },
  contentType: { type: "string", description: "MIME类型" },
} as const;

const OSSDirectoryVO = {
  key: { type: "string", description: "目录路径" },
  name: { type: "string", description: "目录名称" },
  prefix: { type: "string", description: "进入该目录所需的路径前缀" },
} as const;

export const listReq = {
  type: "object",
  properties: {
    keyword: { type: "string", description: "前缀/路径搜索" },
    pageNo: {
      type: "number",
      description: "页码,兼容游标分页",
    },
    pageSize: {
      type: "number",
      description: "每页数量",
      default: 10,
    },
    cursor: { type: "string", description: "下一页游标" },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

export const listRes = {
  type: "object",
  properties: {
    list: {
      type: "array",
      items: {
        type: "object",
        properties: { ...OSSFileBaseVO },
        required: ["key"],
        additionalProperties: false,
      },
    },
    total: { type: "number", description: "当前页数量" },
    pageSize: { type: "number" },
    cursor: { type: "string", description: "下一页游标" },
    hasMore: { type: "boolean", description: "是否有更多数据" },
  },
  required: ["list", "total", "pageSize", "hasMore"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const listDirectoryReq = {
  type: "object",
  properties: {
    prefix: { type: "string", description: "当前目录前缀" },
    pageSize: {
      type: "number",
      description: "每页数量",
      default: 100,
    },
    cursor: { type: "string", description: "下一页游标" },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

export const listDirectoryRes = {
  type: "object",
  properties: {
    prefix: { type: "string", description: "当前目录前缀" },
    directories: {
      type: "array",
      items: {
        type: "object",
        properties: { ...OSSDirectoryVO },
        required: ["key", "name", "prefix"],
        additionalProperties: false,
      },
    },
    files: {
      type: "array",
      items: {
        type: "object",
        properties: { ...OSSFileBaseVO },
        required: ["key"],
        additionalProperties: false,
      },
    },
    pageSize: { type: "number" },
    cursor: { type: "string", description: "下一页游标" },
    hasMore: { type: "boolean", description: "是否有更多数据" },
  },
  required: ["prefix", "directories", "files", "pageSize", "hasMore"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const listAllReq = {
  type: "object",
  properties: {
    keyword: { type: "string", description: "前缀/路径搜索" },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

export const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: { ...OSSFileBaseVO },
    required: ["key"],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;

export const getReq = {
  type: "object",
  properties: {
    key: { type: "string", description: "文件路径/键名" },
  },
  required: ["key"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const getRes = {
  type: "object",
  properties: {
    ...OSSFileBaseVO,
    downloadUrl: { type: "string", description: "临时下载链接" },
  },
  required: ["key", "downloadUrl"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const addReq = {
  type: "object",
  properties: {
    key: { type: "string", description: "文件路径/键名" },
    contentType: {
      type: "string",
      description: "文件类型",
      default: "application/octet-stream",
    },
    expiresIn: {
      type: "number",
      description: "预签名URL过期时间(秒)",
      default: 3600,
    },
  },
  required: ["key"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const addRes = {
  type: "object",
  properties: {
    url: { type: "string", description: "上传预签名URL" },
    key: { type: "string" },
  },
  required: ["url", "key"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const updateReq = addReq;
export const updateRes = addRes;

export const deleteReq = {
  type: "object",
  properties: {
    key: { type: "string", description: "文件路径/键名" },
  },
  required: ["key"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const deleteRes = {
  type: "object",
  properties: {
    key: { type: "string" },
  },
  required: ["key"],
  additionalProperties: false,
} as const satisfies JSONSchema;
