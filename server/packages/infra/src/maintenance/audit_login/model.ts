import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import {
  IndexPO,
  IndexVO,
  AuditPO,
  AuditVO,
  IndexKey,
  AuditKeys,
  type IndexKeyLike,
  type AuditAddOmitKeyLike,
  type AuditUpdateOmitKeyLike,
} from "@hodor/core/db/common/schema";
import { type RequiredKeys } from "@hodor/core/types/app";

//----------------- PO ----------------//
const LoginAuditBasePO = {
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
} as const satisfies Partial<Record<keyof LoginAuditPOLike, JSONSchema>>;

const LoginAuditPO = {
  ...IndexPO,
  ...LoginAuditBasePO,
  ...AuditPO,
} as const satisfies Record<keyof LoginAuditPOLike, JSONSchema>;

export type LoginAuditPOLike = InferSelectModel<typeof loginAuditTable>;
type LoginAuditSelectPOLike = InferInsertModel<typeof loginAuditTable>;
type LoginAuditAddPOLike = Omit<
  LoginAuditPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type LoginAuditUpdatePOLike = Partial<
  Omit<LoginAuditSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<LoginAuditPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
const LoginAuditBaseVO = LoginAuditBasePO;
export const LoginAuditVO = {
  ...IndexVO,
  ...LoginAuditBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof LoginAuditVOLike, JSONSchema>>;

export type LoginAuditVOLike = LoginAuditPOLike;
export type LoginAuditAddVOLike = Omit<LoginAuditAddPOLike, "creatorId">;
export type LoginAuditUpdateVOLike = LoginAuditUpdatePOLike;
export type LoginAuditDeleteVOLike = Pick<LoginAuditVOLike, IndexKeyLike>;
export type LoginAuditGetVOLike = Pick<LoginAuditVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const LoginAuditAddKeys = [
  "userId",
  "loginTimeUtc",
] as const satisfies RequiredKeys<LoginAuditAddVOLike>[];
export const LoginAuditUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<LoginAuditUpdateVOLike>[];
export const LoginAuditDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<LoginAuditDeleteVOLike>[];
export const LoginAuditGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<LoginAuditGetVOLike>[];
const LoginAuditBaseKeys = [
  ...IndexKey,
  "userId",
  "loginTimeUtc",
  ...AuditKeys,
] as const satisfies RequiredKeys<LoginAuditPOLike>[];

export const LoginAuditListKeys = LoginAuditBaseKeys;
export const LoginAuditDetailKeys = LoginAuditBaseKeys;
export const LoginAuditSortableKeys = [
  "id",
  "userId",
  "loginTimeUtc",
  "createTimeUtc",
] as const satisfies RequiredKeys<LoginAuditPOLike>[];

//----------------- Table ----------------//
export const loginAuditTable = sqliteTable(
  "maintenance_audit_login",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    loginTimeUtc: integer("login_time_utc").notNull(),
    ip: text("ip", { length: 50 }),
    userAgent: text("user_agent", { length: 500 }),
    remark: text("remark"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    index("idx_login_audit_user_id").on(table.userId),
    index("idx_login_audit_time").on(table.loginTimeUtc),
  ]
);

export default loginAuditTable;
