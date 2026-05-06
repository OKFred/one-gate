import { type JSONSchema } from "json-schema-to-ts";

const OSSFileBaseVO = {
  key: { type: "string", description: "文件路径/键名" },
  size: { type: "number", description: "文件大小 (字节)" },
  lastModified: { type: "string", description: "最后修改时间" },
  contentType: { type: "string", description: "MIME类型" },
} as const;

// 1. list (分页列表)
export const listReq = {
  type: "object",
  properties: {
    keyword: { type: "string", description: "前缀/路径搜索 (对应 prefix)" },
    pageSize: {
      type: "number",
      description: "每页数量 (对应 limit)",
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
      },
    },
    pageSize: { type: "number" },
    cursor: { type: "string", description: "下一页游标" },
    hasMore: { type: "boolean", description: "是否还有更多数据" },
  },
  required: ["list", "pageSize", "hasMore"],
  additionalProperties: false,
} as const satisfies JSONSchema;

// 2. listAll (获取全部文件)
export const listAllReq = {
  type: "object",
  properties: {
    keyword: { type: "string", description: "前缀/路径搜索 (对应 prefix)" },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

export const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: { ...OSSFileBaseVO },
    required: ["key"],
  },
} as const satisfies JSONSchema;

// 3. get (获取文件详情和下载链接)
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

// 4. add (获取上传凭证，即新建文件)
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
      description: "凭证过期时间(秒)",
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

// 5. update (覆盖文件，等同于 add，为了接口统一而设立)
export const updateReq = addReq;
export const updateRes = addRes;

// 6. delete
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
