import db from "@/db/index";
import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
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
} from "@/db/common/schema";
import { type RequiredKeys } from "@/types/app";

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
    id: integer("id").primaryKey().notNull(),
    mailAddress: text("mail_address").notNull().unique(),
    password: text("password").notNull(),
    nickname: text("nickname").notNull(),
    host: text("host").notNull(),
    port: integer("port").notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
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

export async function tableInit() {
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sqlPath = path.resolve(__dirname, "../../../db/sql/mail_account.sql");

    const sql = fs.readFileSync(sqlPath, "utf8");
    const sqlStatements = sql.split(";").filter((s) => s.trim());

    for (const statement of sqlStatements) {
      if (statement.trim()) {
        await db.run(statement);
      }
    }
    console.log("💾 表 mail_account 已初始化");
  } catch (err) {
    console.error("❌ 初始化表 mail_account 失败:", err);
  }
}

export default mailAccountTable;
