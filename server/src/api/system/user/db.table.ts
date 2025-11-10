import db from "@/db/index";
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";

export const userIndex = {
    id: {
        type: "number",
        description: "用户id",
        examples: [1],
    },
} as const satisfies Partial<Record<keyof userLike, JSONSchema>>;

export const userUnique = {
    username: {
        type: "string",
        description: "用户名",
        examples: ["admin"],
    },
} as const satisfies Partial<Record<keyof userLike, JSONSchema>>;

export const userData = {
    username: {
        type: "string",
        description: "用户名",
        examples: ["admin"],
    },
    password: {
        type: "string",
        description: "密码",
        examples: ["password123"],
    },
    department: {
        type: "string",
        description: "部门",
        examples: ["技术部"],
    },
    role: {
        type: "string",
        description: "角色",
        examples: ["管理员"],
    },
    isEnabled: {
        type: "boolean",
        description: "是否启用",
        default: true,
    },
} as const satisfies Partial<Record<keyof userLike, JSONSchema>>;

export const userAudit = {
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
} as const satisfies Partial<Record<keyof userLike, JSONSchema>>;

export type userLike = InferSelectModel<typeof userTable>;
export type userAddLike = InferInsertModel<typeof userTable>;

export const userTable = sqliteTable("system_user", {
    id: integer("id").primaryKey().notNull(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    department: text("department").notNull(),
    role: text("role").notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
    createTimeUtc: integer("create_time_utc")
        .notNull()
        .default(
            sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`,
        ),
    updateTimeUtc: integer("update_time_utc"),
});

export async function tableInit() {
    await db.run(`
        CREATE TABLE IF NOT EXISTS system_user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            department TEXT NOT NULL,
            role TEXT NOT NULL,
            is_enabled INTEGER NOT NULL DEFAULT 1,
            create_time_utc INTEGER DEFAULT (
              CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
              CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
            ),
            update_time_utc INTEGER
        )
    `);
    console.log("System user table initialized");
}

export default userTable;
