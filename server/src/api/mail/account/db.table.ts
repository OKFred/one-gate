import db from "@/db/index";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";

export const mailAccountIndex = {
  id: {
    type: "number",
    description: "邮箱账号ID",
    examples: [1],
  },
} as const satisfies Partial<Record<keyof mailAccountLike, JSONSchema>>;

export const mailAccountUnique = {
  mailAddress: {
    type: "string",
    format: "email",
    description: "邮箱地址",
    examples: ["maddison53@ethereal.email"],
  },
} as const satisfies Partial<Record<keyof mailAccountLike, JSONSchema>>;

export const mailAccountData = {
  mailAddress: {
    type: "string",
    format: "email",
    description: "邮箱地址",
    examples: ["maddison53@ethereal.email"],
  },
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
  sslEnable: {
    type: "boolean",
    description: "是否启用SSL",
    default: true,
  },
  starttlsEnable: {
    type: "boolean",
    description: "是否启用STARTTLS",
    default: false,
  },
} as const satisfies Partial<Record<keyof mailAccountLike, JSONSchema>>;

export const mailAccountAudit = {
  creatorId: {
    type: "number",
    description: "创建者ID",
  },
  updaterId: {
    type: "number",
    description: "更新者ID",
    nullable: true,
  },
  createTimeUtc: {
    type: "number",
    description: "创建时间",
    examples: [1672531199000],
  },
  updateTimeUtc: {
    type: "number",
    nullable: true,
    description: "更新时间",
    examples: [1672531199000],
  },
} as const satisfies Partial<Record<keyof mailAccountLike, JSONSchema>>;

export const mailAccountTable = sqliteTable("mail_account", {
  id: integer("id").primaryKey().notNull(),
  mailAddress: text("mail_address").notNull().unique(),
  password: text("password").notNull(),
  nickname: text("nickname").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  sslEnable: integer("ssl_enable", { mode: "boolean" }).notNull(),
  starttlsEnable: integer("starttls_enable", { mode: "boolean" }).notNull(),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export type mailAccountLike = InferSelectModel<typeof mailAccountTable>;
export type mailAccountAddLike = InferInsertModel<typeof mailAccountTable>;

export async function tableInit() {
  await db.run(`
        CREATE TABLE IF NOT EXISTS mail_account (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mail_address TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            nickname TEXT NOT NULL,
            host TEXT NOT NULL,
            port INTEGER NOT NULL,
            ssl_enable INTEGER NOT NULL,
            starttls_enable INTEGER NOT NULL,
            creator_id INTEGER NOT NULL,
            updater_id INTEGER,
            create_time_utc INTEGER DEFAULT (
              CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
              CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
            ),
            update_time_utc INTEGER
        )
    `);
  console.log("💾 表 mail_account 已初始化");
}

export default mailAccountTable;
