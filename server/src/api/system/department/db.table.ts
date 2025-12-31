import db from "@/db/index";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";

export const departmentIndex = {
  id: {
    type: "number",
    description: "部门ID",
    examples: [1],
  },
} as const satisfies Partial<Record<keyof departmentLike, JSONSchema>>;

export const departmentData = {
  name: {
    type: "string",
    description: "部门名称",
    examples: ["技术部"],
  },
  description: {
    type: "string",
    description: "部门描述",
    examples: ["负责技术研发工作"],
  },
  parentId: {
    type: ["number", "null"],
    nullable: true,
    description: "父部门ID，支持部门层级",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
} as const satisfies Partial<Record<keyof departmentLike, JSONSchema>>;

export const departmentAudit = {
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
} as const satisfies Partial<Record<keyof departmentLike, JSONSchema>>;

export type departmentLike = InferSelectModel<typeof departmentTable>;
export type departmentAddLike = InferInsertModel<typeof departmentTable>;

export const departmentTable = sqliteTable("system_department", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull().unique(),
  description: text("description"),
  parentId: integer("parent_id"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export async function tableInit() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS system_department (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      parent_id INTEGER,
      is_enabled INTEGER NOT NULL,
      creator_id INTEGER NOT NULL,
      updater_id INTEGER,
      create_time_utc INTEGER DEFAULT (
        CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
        CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
      ),
      update_time_utc INTEGER
    )
  `);
  console.log("💾 表 system_department 已初始化");
}

export default departmentTable;
