import db from "@/db/index";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import { count, sql } from "drizzle-orm";
import { initialMenuData } from "./initialMenu";

export const menuIndex = {
  id: {
    type: "number",
    description: "菜单ID",
    examples: [1],
  },
} as const satisfies Partial<Record<keyof menuLike, JSONSchema>>;

export const menuData = {
  text: {
    type: "string",
    description: "菜单名称",
    examples: ["主页"],
  },
  icon: {
    type: "string",
    description: "图标名称，使用 Iconify material-symbols 图标",
    examples: ["material-symbols:home"],
  },
  path: {
    type: ["string", "null"],
    nullable: true,
    description: "路由路径",
    examples: ["/home"],
  },
  parentId: {
    type: ["number", "null"],
    nullable: true,
    description: "父菜单ID，支持菜单层级",
  },
  sort: {
    type: "number",
    description: "排序",
  },
  roleIdArr: {
    type: "array",
    description: "需要的角色ID列表",
    items: { type: "number" },
    examples: [[1, 2]],
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
} as const satisfies Partial<Record<keyof menuLike, JSONSchema>>;

export const menuAudit = {
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
} as const satisfies Partial<Record<keyof menuLike, JSONSchema>>;

export type menuLike = InferSelectModel<typeof menuTable>;
export type menuAddLike = InferInsertModel<typeof menuTable>;

export const menuTable = sqliteTable("system_menu", {
  id: integer("id").primaryKey().notNull(),
  text: text("text").notNull(),
  icon: text("icon").notNull(),
  path: text("path"),
  parentId: integer("parent_id"),
  sort: integer("sort").notNull(),
  roleIdArr: text("role_id_arr", { mode: "json" }).$type<number[]>().notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export async function tableInit() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS system_menu (
      id INTEGER PRIMARY KEY,
      text TEXT NOT NULL,
      icon TEXT NOT NULL,
      path TEXT,
      parent_id INTEGER,
      sort INTEGER NOT NULL,
      role_id_arr TEXT,
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
  console.log("💾 表 system_menu 已初始化");

  // 检查是否已有数据，没有则插入初始数据
  const countResult = await db
    .select({ total: count(menuTable.id).as("total") })
    .from(menuTable);

  if (countResult[0]?.total === 0) {
    for (const menu of initialMenuData) {
      await db.insert(menuTable).values({
        id: menu.id,
        text: menu.text,
        icon: menu.icon,
        sort: menu.sort,
        path: menu.path || null,
        parentId: menu.parentId || null,
        roleIdArr: menu.roleIdArr || null,
        isEnabled: true,
        creatorId: 1, // 系统初始化用户
      });
    }
    console.log("💾 表 system_menu 初始数据已插入");
  }
}

export default menuTable;
