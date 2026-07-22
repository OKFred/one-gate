import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
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
const MailAccountUniquePO = {
  mailAddress: {
    type: "string",
    format: "email",
    description: "邮箱地址",
    examples: ["maddison53@ethereal.email"],
  },
} as const satisfies Partial<Record<keyof MailAccountPOLike, JSONSchema>>;

const MailAccountBasePO = {
  password: {
    type: "string",
    description: "邮箱密码",
    examples: ["jn7jnAPss4f63QBp6D"],
  },
  nickname: {
    type: "string",
    description: "昵称",
    examples: ["Maddison Foo KochZh"],
  },
  host: {
    type: "string",
    description: "邮箱服务器地址",
    examples: ["smtp.ethereal.email"],
  },
  port: {
    type: "number",
    description: "邮箱服务器端口",
    examples: [587, 465],
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  scope: {
    type: "string",
    enum: ["sys", "biz"],
    description: "作用域：sys(系统级)/biz(企业级)",
    default: "sys",
  },
  tenantId: {
    type: ["number", "null"],
    description: "租户ID（企业级专用）",
    nullable: true,
  },
  userId: {
    type: ["number", "null"],
    description: "用户ID（个人级专用）",
    nullable: true,
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    examples: ["这是一个测试邮箱账号"],
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof MailAccountPOLike, JSONSchema>>;

const MailAccountPO = {
  ...IndexPO,
  ...MailAccountUniquePO,
  ...MailAccountBasePO,
  ...AuditPO,
} as const satisfies Record<keyof MailAccountPOLike, JSONSchema>;

export type MailAccountPOLike = InferSelectModel<typeof mailAccountTable>;
type MailAccountSelectPOLike = InferInsertModel<typeof mailAccountTable>;
type MailAccountAddPOLike = Omit<
  MailAccountPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type MailAccountUpdatePOLike = Partial<
  Omit<MailAccountSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<MailAccountPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const MailAccountUniqueVO = MailAccountUniquePO;
export const MailAccountBaseVO = MailAccountBasePO;
export const MailAccountVO = {
  ...IndexVO,
  ...MailAccountUniqueVO,
  ...MailAccountBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof MailAccountVOLike, JSONSchema>>;
export const MailAccountListVO = MailAccountVO;
export const MailAccountAddVO = {
  ...MailAccountUniqueVO,
  ...MailAccountBaseVO,
} as const satisfies Partial<Record<keyof MailAccountVOLike, JSONSchema>>;
export const MailAccountUpdateVO = {
  ...IndexVO,
  ...MailAccountUniqueVO,
  ...MailAccountBaseVO,
} as const satisfies Partial<Record<keyof MailAccountVOLike, JSONSchema>>;

export type MailAccountVOLike = MailAccountPOLike;
export type MailAccountAddVOLike = Omit<MailAccountAddPOLike, "creatorId">;
export type MailAccountUpdateVOLike = MailAccountUpdatePOLike;
export type MailAccountDeleteVOLike = Pick<MailAccountVOLike, IndexKeyLike>;
export type MailAccountGetVOLike = Pick<MailAccountVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const MailAccountAddKeys = [
  "mailAddress",
  "password",
  "nickname",
  "host",
  "port",
  "isEnabled",
  "remark",
] as const satisfies RequiredKeys<MailAccountAddVOLike>[];

export const MailAccountUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MailAccountUpdateVOLike>[];

export const MailAccountDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MailAccountDeleteVOLike>[];

export const MailAccountGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MailAccountGetVOLike>[];

const MailAccountBaseKeys = [
  ...IndexKey,
  ...MailAccountAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<MailAccountPOLike>[];

export const MailAccountListKeys = MailAccountBaseKeys;
export const MailAccountDetailKeys = MailAccountBaseKeys;
export const MailAccountUniqueKeys = ["mailAddress"] as const;

// 可排序字段
export const MailAccountSortableKeys = [
  "id",
  "mailAddress",
  "isEnabled",
  "createTimeUtc",
] as const satisfies RequiredKeys<MailAccountPOLike>[];

export const mailAccountTable = sqliteTable(
  "mail_account",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mailAddress: text("mail_address").notNull().unique(),
    password: text("password").notNull(),
    nickname: text("nickname").notNull(),
    host: text("host").notNull(),
    port: integer("port").notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
    scope: text("scope").$type<"sys" | "biz">().notNull().default("sys"),
    tenantId: integer("tenant_id"),
    userId: integer("user_id"),
    remark: text("remark"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [uniqueIndex("idx_mail_address").on(table.mailAddress)]
);

export default mailAccountTable;
