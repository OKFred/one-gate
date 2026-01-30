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
const PermissionUniquePO = {
  code: {
    type: "string",
    description: "权限代码，唯一标识",
    examples: ["user:read", "file:write:own"],
    maxLength: 100,
  },
} as const satisfies Partial<Record<keyof PermissionPOLike, JSONSchema>>;

const PermissionBasePO = {
  name: {
    type: "string",
    description: "权限名称",
    examples: ["查看用户", "编辑文件"],
    maxLength: 100,
  },
  category: {
    type: "string",
    enum: ["menu", "button", "api"],
    description: "权限类别：menu-菜单，button-按钮，api-接口",
  },
  resource: {
    type: ["string", "null"],
    nullable: true,
    description: "资源路径",
    examples: ["/api/users/:id", "/dashboard/users"],
    maxLength: 500,
  },
  effect: {
    type: "string",
    enum: ["allow", "deny"],
    description: "效果：allow-允许，deny-拒绝",
  },
  scope: {
    type: "string",
    enum: ["all", "own", "dept", "custom"],
    description: "资源范围：all-所有，own-仅自己，dept-本部门，custom-自定义",
  },
  parentId: {
    type: ["number", "null"],
    nullable: true,
    description: "父权限ID，用于菜单层级",
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
} as const satisfies Partial<Record<keyof PermissionPOLike, JSONSchema>>;

const PermissionPO = {
  ...IndexPO,
  ...PermissionUniquePO,
  ...PermissionBasePO,
  ...AuditPO,
} as const satisfies Record<keyof PermissionPOLike, JSONSchema>;

export type PermissionPOLike = InferSelectModel<typeof permissionTable>;
type PermissionSelectPOLike = InferInsertModel<typeof permissionTable>;
type PermissionAddPOLike = Omit<
  PermissionPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type PermissionUpdatePOLike = Partial<
  Omit<PermissionSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<PermissionPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const PermissionUniqueVO = PermissionUniquePO;
export const PermissionBaseVO = PermissionBasePO;
export const PermissionVO = {
  ...IndexVO,
  ...PermissionUniqueVO,
  ...PermissionBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof PermissionVOLike, JSONSchema>>;
export const PermissionListVO = PermissionVO;
export const PermissionAddVO = {
  ...PermissionUniqueVO,
  ...PermissionBaseVO,
} as const satisfies Partial<Record<keyof PermissionVOLike, JSONSchema>>;
export const PermissionUpdateVO = {
  ...IndexVO,
  ...PermissionUniqueVO,
  ...PermissionBaseVO,
} as const satisfies Partial<Record<keyof PermissionVOLike, JSONSchema>>;

export type PermissionVOLike = PermissionPOLike;
export type PermissionAddVOLike = Omit<PermissionAddPOLike, "creatorId">;
export type PermissionUpdateVOLike = PermissionUpdatePOLike;
export type PermissionDeleteVOLike = Pick<PermissionVOLike, IndexKeyLike>;
export type PermissionGetVOLike = Pick<PermissionVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const PermissionAddKeys = [
  "code",
  "name",
  "category",
  "resource",
  "effect",
  "scope",
  "parentId",
  "remark",
  "isEnabled",
] as const satisfies RequiredKeys<PermissionAddVOLike>[];
export const PermissionUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<PermissionUpdateVOLike>[];
export const PermissionDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<PermissionDeleteVOLike>[];
export const PermissionGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<PermissionGetVOLike>[];
const PermissionBaseKeys = [
  ...IndexKey,
  ...PermissionAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<PermissionPOLike>[];
export const PermissionListKeys = PermissionBaseKeys;
export const PermissionDetailKeys = PermissionBaseKeys;
export const PermissionUniqueKeys = ["code"] as const;

// 可排序字段
export const PermissionSortableKeys = [
  "id",
  "code",
  "name",
  "category",
  "effect",
  "isEnabled",
  "createTimeUtc",
] as const satisfies RequiredKeys<PermissionPOLike>[];

export const permissionTable = sqliteTable("system_permission", {
  id: integer("id").primaryKey().notNull(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(), // menu, button, api
  resource: text("resource"),
  effect: text("effect").notNull(), // allow, deny
  scope: text("scope").notNull(), // all, own, dept, custom
  parentId: integer("parent_id"),
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
  await db.run(`
    CREATE TABLE IF NOT EXISTS system_permission (
      id INTEGER PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      resource TEXT,
      effect TEXT NOT NULL,
      scope TEXT NOT NULL,
      parent_id INTEGER,
      remark TEXT,
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
  console.log("💾 表 system_permission 已初始化");
}

export default permissionTable;
