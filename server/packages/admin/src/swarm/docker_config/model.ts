import type { JSONSchema } from "json-schema-to-ts";
import {
  IndexVO,
  AuditVO,
  IndexKey,
  AuditKeys,
} from "@hodor/core/db/common/schema";
import { type RequiredKeys } from "@hodor/core/types/app";

//----------------- PO ----------------//
const SwarmDockerConfigBasePO = {
  name: {
    type: "string",
    description: "配置名称",
    examples: ["My Docker Swarm"],
    maxLength: 100,
  },
  host: {
    type: "string",
    description: "Docker Host 地址",
    examples: ["https://127.0.0.1:2376"],
  },
  apiVersion: {
    type: "string",
    description: "Docker API 版本",
    examples: ["v1.47"],
  },
  tlsVerify: {
    type: "boolean",
    description: "是否启用 TLS 验证",
  },
  caCert: {
    type: ["string", "null"],
    nullable: true,
    description: "CA 证书内容",
  },
  clientCert: {
    type: ["string", "null"],
    nullable: true,
    description: "客户端证书内容",
  },
  clientKey: {
    type: ["string", "null"],
    nullable: true,
    description: "客户端私钥",
  },
  cfMtlsBinding: {
    type: ["string", "null"],
    nullable: true,
    description: "Cloudflare mTLS 证书绑定名称",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  isDefault: {
    type: "boolean",
    description: "是否为默认配置",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    maxLength: 500,
  },
} as const satisfies Record<string, JSONSchema>;

//----------------- VO ----------------//
export { IndexVO };
export const SwarmDockerConfigVO = {
  ...IndexVO,
  ...SwarmDockerConfigBasePO,
  ...AuditVO,
} as const satisfies Record<string, JSONSchema>;

export const SwarmDockerConfigListVO = SwarmDockerConfigVO;

export const SwarmDockerConfigAddVO = {
  ...SwarmDockerConfigBasePO,
} as const satisfies Record<string, JSONSchema>;

export const SwarmDockerConfigUpdateVO = {
  ...IndexVO,
  ...SwarmDockerConfigBasePO,
} as const satisfies Record<string, JSONSchema>;

export const SwarmDockerConfigDetailVO = SwarmDockerConfigVO;

//----------------- Required Keys ----------------//
export const SwarmDockerConfigAddKeys = [
  "name",
  "host",
  "tlsVerify",
  "isEnabled",
  "isDefault",
] as const;

export const SwarmDockerConfigUpdateKeys = [...IndexKey] as const;

export const SwarmDockerConfigDeleteKeys = [...IndexKey] as const;

export const SwarmDockerConfigGetKeys = [...IndexKey] as const;

export const SwarmDockerConfigDetailKeys = [
  "id",
  "name",
  "host",
  "tlsVerify",
  "isEnabled",
  "isDefault",
  "creatorId",
  "createTimeUtc",
] as const;

export const SwarmDockerConfigListKeys = [
  ...SwarmDockerConfigDetailKeys,
] as const;

// 可排序字段
export const SwarmDockerConfigSortableKeys = [
  "id",
  "name",
  "isEnabled",
  "isDefault",
  "createTimeUtc",
] as const;
