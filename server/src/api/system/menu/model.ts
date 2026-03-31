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
  IndexKey,
  AuditKeys,
  type IndexKeyLike,
  type AuditAddOmitKeyLike,
  type AuditUpdateOmitKeyLike,
} from "@/db/common/schema";
import { type RequiredKeys } from "@/types/app";

//----------------- PO ----------------//
const MenuBasePO = {
  name: {
    type: "string",
    description: "菜单名称",
    examples: ["主页"],
    maxLength: 100,
  },
  icon: {
    type: "string",
    description: "图标名称，使用 Iconify material-symbols 图标",
    examples: ["material-symbols:home"],
    maxLength: 100,
  },
  path: {
    type: ["string", "null"],
    nullable: true,
    description: "路由路径",
    examples: ["/home"],
    maxLength: 500,
  },
  parentId: {
    type: ["number", "null"],
    nullable: true,
    description: "父菜单ID，支持菜单层级",
    minimum: 1,
  },
  sort: {
    type: "number",
    description: "排序",
    minimum: 0,
    maximum: 1000,
  },
  business: {
    type: ["string", "null"],
    nullable: true,
    description: "业务标识",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注说明",
    maxLength: 500,
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
type MenuAddPOLike = Omit<MenuPOLike, IndexKeyLike | AuditAddOmitKeyLike>;
type MenuUpdatePOLike = Partial<
  Omit<MenuSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<MenuPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO }; // 删改查
export const MenuBaseVO = MenuBasePO;
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
export const MenuAddKeys = [
  "name",
  "icon",
  "path",
  "parentId",
  "sort",
  "business",
  "remark",
  "isEnabled",
] as const satisfies RequiredKeys<MenuAddVOLike>[];
export const MenuUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MenuUpdateVOLike>[];
export const MenuDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MenuDeleteVOLike>[];
export const MenuGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MenuGetVOLike>[];
const MenuBaseKeys = [
  ...IndexKey,
  ...MenuAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<MenuPOLike>[];
export const MenuListKeys = MenuBaseKeys;
export const MenuDetailKeys = MenuBaseKeys;

// 可排序字段（解耦供 service 使用）
export const MenuSortableKeys = [
  "id",
  "name",
  "business",
  "isEnabled",
  "createTimeUtc",
] as const satisfies RequiredKeys<MenuPOLike>[];

export const menuTable = sqliteTable("system_menu", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  path: text("path"),
  parentId: integer("parent_id"),
  sort: integer("sort").notNull(),
  business: text("business").notNull(),
  remark: text("remark"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export async function tableInit() {
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sqlPath = path.resolve(__dirname, "../../../db/sql/system_menu.sql");

    const sql = fs.readFileSync(sqlPath, "utf8");
    const sqlStatements = sql.split(";").filter((s) => s.trim());

    for (const statement of sqlStatements) {
      if (statement.trim()) {
        await db.run(statement);
      }
    }
    console.log("💾 表 system_menu 已初始化");
  } catch (err) {
    console.error("❌ 初始化表 system_menu 失败:", err);
  }
}

export default menuTable;
