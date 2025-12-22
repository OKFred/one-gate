import db from "@/db/index";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";

export const roleIndex = {
  id: {
    type: "number",
    description: "角色ID",
    examples: [1],
  },
} as const satisfies Partial<Record<keyof roleLike, JSONSchema>>;

export const roleData = {
  name: {
    type: "string",
    description: "角色名称",
    examples: ["管理员"],
  },
  description: {
    type: "string",
    description: "角色描述",
    examples: ["系统管理员，拥有所有权限"],
  },
  permissions: {
    type: "string",
    description: "权限列表，JSON数组格式",
    examples: ['["user:read","user:write","system:admin"]'],
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
    default: true,
  },
} as const satisfies Partial<Record<keyof roleLike, JSONSchema>>;

export const roleAudit = {
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
} as const satisfies Partial<Record<keyof roleLike, JSONSchema>>;

export type roleLike = InferSelectModel<typeof roleTable>;
export type roleAddLike = InferInsertModel<typeof roleTable>;

export const roleTable = sqliteTable("system_role", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: text("permissions"), // JSON array string
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export async function tableInit() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS system_role (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      creator_id INTEGER NOT NULL,
      updater_id INTEGER,
      create_time_utc INTEGER DEFAULT (
        CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
        CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
      ),
      update_time_utc INTEGER
    )
  `);
  console.log("💾 表 system_role 已初始化");
}

export default roleTable;
