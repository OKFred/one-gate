import db from "@/db/index";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import {
  IndexPO,
  IndexVO,
  AuditPO,
  AuditVO,
  AuditKeys,
  type IndexKeyLike,
  type AuditAddOmitKeyLike,
  type AuditUpdateOmitKeyLike,
} from "@/db/common/schema";
import { type RequiredKeys } from "@/types/app";

//----------------- PO ----------------//
const MenuBasePO = {
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
} as const satisfies Partial<Record<keyof MenuPOLike, JSONSchema>>;
const MenuPO = {
  ...IndexPO,
  ...MenuBasePO,
  ...AuditPO,
} as const satisfies Record<keyof MenuPOLike, JSONSchema>;
export type MenuPOLike = InferSelectModel<typeof menuTable>; // 列表
type MenuSelectPOLike = InferInsertModel<typeof menuTable>;
type MenuAddPOLike = Omit<MenuSelectPOLike, IndexKeyLike | AuditAddOmitKeyLike>;
type MenuUpdatePOLike = Partial<
  Omit<MenuSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<MenuPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO }; // 删改查
const MenuBaseVO = MenuBasePO;
export const MenuVO = {
  ...IndexVO,
  ...MenuBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof MenuVOLike, JSONSchema>>; // 详情
export const MenuListVO = MenuVO; // 列表
export const MenuAddVO = {
  ...MenuBaseVO,
} as const satisfies Partial<Record<keyof MenuVOLike, JSONSchema>>; // 新增
export const MenuUpdateVO = {
  ...IndexVO,
  ...MenuBaseVO,
} as const satisfies Partial<Record<keyof MenuVOLike, JSONSchema>>; // 更新
export type MenuVOLike = MenuPOLike;
export type MenuAddVOLike = Omit<MenuAddPOLike, "creatorId">;
export type MenuUpdateVOLike = MenuUpdatePOLike;
export type MenuDeleteVOLike = Pick<MenuVOLike, IndexKeyLike>;
export type MenuGetVOLike = Pick<MenuVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
const MenuBaseKeys = [
  "id",
  "text",
  "icon",
  "path",
  "parentId",
  "sort",
  "roleIdArr",
  "isEnabled",
  ...AuditKeys,
] as const satisfies RequiredKeys<MenuPOLike>[];
export const MenuListKeys = MenuBaseKeys;
export const MenuDetailKeys = MenuBaseKeys;
export const MenuAddKeys = [
  "text",
  "icon",
  "sort",
  "roleIdArr",
  "isEnabled",
] as const satisfies RequiredKeys<MenuAddVOLike>[];
export const MenuUpdateKeys = [
  "id",
] as const satisfies RequiredKeys<MenuUpdateVOLike>[];
export const MenuDeleteKeys = [
  "id",
] as const satisfies RequiredKeys<MenuDeleteVOLike>[];
export const MenuGetKeys = [
  "id",
] as const satisfies RequiredKeys<MenuGetVOLike>[];

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
  await db.run(`
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
}

export default menuTable;
