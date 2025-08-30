import db from "@/db/index";
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { JSONSchema } from "json-schema-to-ts";

export const mailAccountIndexAlias = {
    accountId: {
        type: "number",
        description: "邮箱账号id",
        examples: [1],
    },
};

export const mailAccountIndex = {
    id: {
        type: "number",
        description: "邮箱账号id",
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
        default: 587,
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
    accountOwner: {
        type: "string",
        description: "邮箱账号拥有者",
    },
} as const satisfies Partial<Record<keyof mailAccountLike, JSONSchema>>;

export const mailAccountTimestamp = {
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

export type mailAccountLike = InferSelectModel<typeof mailAccountTable>;
export type mailAccountAddLike = InferInsertModel<typeof mailAccountTable>;

export const mailAccountTable = sqliteTable("mail_account", {
    id: integer("id").primaryKey().notNull(),
    mailAddress: text("mail_address").notNull().unique(),
    password: text("password").notNull(),
    nickname: text("nickname").notNull(),
    host: text("host").notNull(),
    port: integer("port").notNull(),
    sslEnable: integer("ssl_enable", { mode: "boolean" }).notNull(),
    starttlsEnable: integer("starttls_enable", { mode: "boolean" }).notNull(),
    accountOwner: text("account_owner").notNull(),
    createTimeUtc: integer("create_time_utc")
        .notNull()
        .default(
            sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`,
        ),
    updateTimeUtc: integer("update_time_utc"),
});

export async function tableInit() {
    await db.run(`
        CREATE TABLE IF NOT EXISTS mail_account (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mail_address TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            nickname TEXT NOT NULL,
            host TEXT NOT NULL,
            port INTEGER NOT NULL DEFAULT 465,
            ssl_enable INTEGER NOT NULL DEFAULT 1,
            starttls_enable INTEGER NOT NULL DEFAULT 0,
            account_owner TEXT NOT NULL,
            create_time_utc INTEGER DEFAULT (
              CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
              CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
            ),
            update_time_utc INTEGER
        )
    `);
    console.log("Table initialized");
}

export default mailAccountTable;
