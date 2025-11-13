import db from "@/db/index";
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";

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
  departmentId: {
    type: "number",
    description: "部门ID",
    examples: [1],
  },
  roleIds: {
    type: "string",
    description: "角色ID列表，逗号分隔",
    examples: ["1,2,3"],
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
  departmentId: integer("department_id"),
  roleIds: text("role_ids").notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export async function tableInit() {
  await db.run(`
        CREATE TABLE IF NOT EXISTS system_user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            department_id INTEGER,
            role_ids TEXT NOT NULL,
            is_enabled INTEGER NOT NULL DEFAULT 1,
            create_time_utc INTEGER DEFAULT (
              CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
              CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
            ),
            update_time_utc INTEGER
        )
    `);
  console.log("💾 表 system_user 已初始化");
}

export default userTable;
