import { type JSONSchema } from "json-schema-to-ts";

// 1. 获取上传预签名 URL
export const getUploadUrlReq = {
  type: "object",
  properties: {
    key: { type: "string", description: "文件名/路径" },
    contentType: {
      type: "string",
      description: "文件类型",
      default: "application/octet-stream",
    },
    expiresIn: { type: "number", description: "过期时间(秒)", default: 3600 },
  },
  required: ["key"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const getUploadUrlRes = {
  type: "object",
  properties: {
    url: { type: "string" },
    key: { type: "string" },
  },
  required: ["url", "key"],
  additionalProperties: false,
} as const satisfies JSONSchema;

// 2. 获取下载预签名 URL
export const getDownloadUrlReq = {
  type: "object",
  properties: {
    key: { type: "string", description: "文件名/路径" },
    expiresIn: { type: "number", description: "过期时间(秒)", default: 3600 },
  },
  required: ["key"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const getDownloadUrlRes = {
  type: "object",
  properties: {
    url: { type: "string" },
    key: { type: "string" },
  },
  required: ["url", "key"],
  additionalProperties: false,
} as const satisfies JSONSchema;

// 3. 列出文件
export const listReq = {
  type: "object",
  properties: {
    prefix: { type: "string", description: "前缀/路径", default: "" },
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
        properties: {
          key: { type: "string" },
          size: { type: "number" },
          lastModified: { type: "string" }, // StorageObjectMetadata.lastModified is Date, but schema often uses string for representation
          contentType: { type: "string" },
        },
        required: ["key"],
      },
    },
  },
  required: ["list"],
  additionalProperties: false,
} as const satisfies JSONSchema;

// 4. 删除文件
export const deleteReq = {
  type: "object",
  properties: {
    key: { type: "string", description: "文件名/路径" },
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
