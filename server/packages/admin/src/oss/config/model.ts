import type { JSONSchema } from "json-schema-to-ts";
import {
  IndexVO,
  AuditVO,
  IndexKey,
  AuditKeys,
} from "@hodor/core/db/common/schema";
import { type RequiredKeys } from "@hodor/core/types/app";

//----------------- PO ----------------//
const OssConfigBasePO = {
  name: { type: "string", description: "配置名称", maxLength: 100 },
  provider: { type: "string", enum: ["S3", "R2"], description: "存储提供商" },
  endpoint: {
    type: ["string", "null"],
    nullable: true,
    description: "服务地址",
  },
  accountId: {
    type: ["string", "null"],
    nullable: true,
    description: "账户 ID (仅 R2 需要)",
  },
  accessKey: { type: "string", description: "访问密钥 AK" },
  secretKey: { type: "string", description: "私有密钥 SK" },
  bucket: { type: "string", description: "存储桶名称" },
  region: { type: "string", default: "auto", description: "区域" },
  isEnabled: { type: "boolean", description: "是否启用" },
  isDefault: { type: "boolean", description: "是否为默认配置" },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    maxLength: 500,
  },
} as const satisfies Record<string, JSONSchema>;

//----------------- VO ----------------//
export { IndexVO };
export const OssConfigVO = {
  ...IndexVO,
  ...OssConfigBasePO,
  ...AuditVO,
} as const satisfies Record<string, JSONSchema>;

export const OssConfigAddVO = {
  ...OssConfigBasePO,
} as const satisfies Record<string, JSONSchema>;

export const OssConfigUpdateVO = {
  ...IndexVO,
  ...OssConfigBasePO,
} as const satisfies Record<string, JSONSchema>;

//----------------- Required Keys ----------------//
export const OssConfigAddKeys = [
  "name",
  "provider",
  "accessKey",
  "secretKey",
  "bucket",
  "isEnabled",
  "isDefault",
] as const;

export const OssConfigUpdateKeys = [...IndexKey] as const;

export const OssConfigGetKeys = [...IndexKey] as const;

export const OssConfigDetailKeys = [
  "id",
  "name",
  "provider",
  "accessKey",
  "secretKey",
  "bucket",
  "isEnabled",
  "isDefault",
] as const;

export const OssConfigListKeys = [
  "id",
  "name",
  "provider",
  "accessKey",
  "secretKey",
  "bucket",
  "isEnabled",
  "isDefault",
  "creatorId",
  "createTimeUtc",
] as const;

/** 可排序字段 */
export const OssConfigSortableKeys = [
  "id",
  "name",
  "isEnabled",
  "isDefault",
  "createTimeUtc",
] as const;
