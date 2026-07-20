import type { JSONSchema } from "json-schema-to-ts";
import {
  IndexPO,
  IndexVO,
  IndexKey,
  type IndexKeyLike,
} from "@hodor/core/db/common/schema";
import { type RequiredKeys } from "@hodor/core/types/app";

//----------------- Base PO ----------------//

export const LoginAuditBasePO = {
  userId: {
    type: "number",
    description: "用户ID",
    examples: [1],
    minimum: 1,
  },
  loginTimeUtc: {
    type: "number",
    description: "登录时间（UTC毫秒时间戳）",
    examples: [1672531199000],
  },
  ip: {
    type: ["string", "null"],
    nullable: true,
    description: "客户端IP地址",
    examples: ["127.0.0.1"],
    maxLength: 50,
  },
  userAgent: {
    type: ["string", "null"],
    nullable: true,
    description: "客户端User-Agent",
    examples: ["Mozilla/5.0..."],
    maxLength: 500,
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注说明",
    maxLength: 500,
  },
} as const satisfies Record<string, JSONSchema>;

export const LoginAuditPO = {
  ...IndexPO,
  ...LoginAuditBasePO,
  creatorId: { type: "number", description: "创建人ID" },
  creatorName: {
    type: ["string", "null"],
    nullable: true,
    description: "创建人名称",
  },
  createTimeUtc: { type: "number", description: "创建时间(UTC)" },
} as const satisfies Record<string, JSONSchema>;

export type LoginAuditPOLike = {
  id: number;
  userId: number;
  loginTimeUtc: number;
  ip: string | null;
  userAgent: string | null;
  remark: string | null;
  creatorId: number;
  creatorName: string | null;
  createTimeUtc: number;
};

//----------------- VO ----------------//
export { IndexVO };
export const LoginAuditVO = {
  ...IndexVO,
  ...LoginAuditBasePO,
  creatorId: { type: "number", description: "创建人ID" },
  creatorName: {
    type: ["string", "null"],
    nullable: true,
    description: "创建人名称",
  },
  createTimeUtc: { type: "number", description: "创建时间(UTC)" },
} as const satisfies Partial<Record<keyof LoginAuditVOLike, JSONSchema>>;

export type LoginAuditVOLike = LoginAuditPOLike;

//----------------- Required Keys ----------------//
export const LoginAuditAddKeys = [
  "userId",
  "loginTimeUtc",
] as const satisfies RequiredKeys<LoginAuditVOLike>[];

const LoginAuditBaseKeys = [
  ...IndexKey,
  "userId",
  "loginTimeUtc",
  "ip",
  "userAgent",
  "creatorId",
  "creatorName",
  "createTimeUtc",
] as const satisfies RequiredKeys<LoginAuditPOLike>[];

export const LoginAuditListKeys = LoginAuditBaseKeys;
export const LoginAuditDetailKeys = LoginAuditBaseKeys;
export const LoginAuditSortableKeys = [
  "id",
  "userId",
  "loginTimeUtc",
  "createTimeUtc",
] as const satisfies RequiredKeys<LoginAuditPOLike>[];
