import type { JSONSchema } from "json-schema-to-ts";
import {
  IndexVO,
  AuditVO,
  IndexKey,
  AuditKeys,
} from "@hodor/core/db/common/schema";

export { IndexVO };

//====================================================================
// RpaConfig PO, VO
//====================================================================

export const RpaConfigBasePO = {
  name: {
    type: "string",
    description: "配置名",
    maxLength: 100,
  },
  cdpUrl: {
    type: "string",
    description:
      "CDP 协议调试连接地址 (e.g. ws://127.0.0.1:9222/devtools/browser/... 或调试主机:端口)。使用 Cloudflare Browser Run 时填写 https://api.cloudflare.com/client/v4/accounts/<您的ACCOUNT_ID>/browser-rendering",
  },
  authToken: {
    type: ["string", "null"],
    nullable: true,
    description:
      "认证 Token（可选）。填写后自动切换为 Cloudflare Browser Run 模式，使用 Bearer Token 进行身份验证",
    maxLength: 500,
  },
  isDefault: {
    type: "boolean",
    description: "是否为主配置",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注信息",
    maxLength: 500,
  },
} as const satisfies Record<string, JSONSchema>;

export const RpaConfigVO = {
  ...IndexVO,
  ...RpaConfigBasePO,
  ...AuditVO,
} as const satisfies Record<string, JSONSchema>;

export const RpaConfigAddVO = {
  ...RpaConfigBasePO,
} as const satisfies Record<string, JSONSchema>;

export const RpaConfigUpdateVO = {
  ...IndexVO,
  ...RpaConfigBasePO,
} as const satisfies Record<string, JSONSchema>;

export const RpaConfigAddKeys = [
  "name",
  "cdpUrl",
  "isDefault",
  "isEnabled",
] as const;

export const RpaConfigUpdateKeys = [...IndexKey] as const;

export const RpaConfigDeleteKeys = [...IndexKey] as const;

export const RpaConfigGetKeys = [...IndexKey] as const;

export const RpaConfigListKeys = [
  ...IndexKey,
  "name",
  "cdpUrl",
  "authToken",
  "isDefault",
  "isEnabled",
  ...AuditKeys,
] as const;

export const RpaConfigDetailKeys = [
  ...IndexKey,
  "name",
  "cdpUrl",
  "authToken",
  "isDefault",
  "isEnabled",
  "remark",
] as const;

export const RpaConfigSortableKeys = [
  "id",
  "name",
  "isDefault",
  "isEnabled",
  "createTimeUtc",
] as const;
