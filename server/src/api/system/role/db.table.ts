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
const RoleUniquePO = {
  name: {
    type: "string",
    description: "角色名称",
    examples: ["管理员"],
    maxLength: 100,
  },
} as const satisfies Partial<Record<keyof RolePOLike, JSONSchema>>;
const RoleBasePO = {
  description: {
    type: ["string", "null"],
    nullable: true,
    description: "角色描述",
    examples: ["系统管理员，拥有所有权限"],
    maxLength: 500,
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注说明",
    maxLength: 1000,
  },
  permissions: {
    type: ["string", "null"],
    nullable: true,
    description: "权限列表，JSON数组格式",
    examples: ['["user:read","user:write","system:admin"]'],
    maxLength: 500,
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
} as const satisfies Partial<Record<keyof RolePOLike, JSONSchema>>;
const RolePO = {
  ...IndexPO,
  ...RoleUniquePO,
  ...RoleBasePO,
  ...AuditPO,
} as const satisfies Record<keyof RolePOLike, JSONSchema>;
export type RolePOLike = InferSelectModel<typeof roleTable>; // 列表
type RoleSelectPOLike = InferInsertModel<typeof roleTable>;
type RoleAddPOLike = Omit<RolePOLike, IndexKeyLike | AuditAddOmitKeyLike>;
type RoleUpdatePOLike = Partial<
  Omit<RoleSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<RolePOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO }; // 删改查
export const RoleUniqueVO = RoleUniquePO;
export const RoleBaseVO = RoleBasePO;
export const RoleVO = {
  ...IndexVO,
  ...RoleUniqueVO,
  ...RoleBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof RoleVOLike, JSONSchema>>; // 详情
export const RoleListVO = RoleVO; // 列表
export const RoleAddVO = {
  ...RoleUniqueVO,
  ...RoleBaseVO,
} as const satisfies Partial<Record<keyof RoleVOLike, JSONSchema>>; // 新增
export const RoleUpdateVO = {
  ...IndexVO,
  ...RoleUniqueVO,
  ...RoleBaseVO,
} as const satisfies Partial<Record<keyof RoleVOLike, JSONSchema>>; // 更新
export type RoleVOLike = RolePOLike;
export type RoleAddVOLike = Omit<RoleAddPOLike, "creatorId">;
export type RoleUpdateVOLike = RoleUpdatePOLike;
export type RoleDeleteVOLike = Pick<RoleVOLike, IndexKeyLike>;
export type RoleGetVOLike = Pick<RoleVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const RoleAddKeys = [
  "name",
  "description",
  "remark",
  "permissions",
  "isEnabled",
] as const satisfies RequiredKeys<RoleAddVOLike>[];
export const RoleUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<RoleUpdateVOLike>[];
export const RoleDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<RoleDeleteVOLike>[];
export const RoleGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<RoleGetVOLike>[];
const RoleBaseKeys = [
  ...IndexKey,
  ...RoleAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<RolePOLike>[];
export const RoleListKeys = RoleBaseKeys;
export const RoleDetailKeys = RoleBaseKeys;
export const RoleUniqueKeys = ["name"] as const;

// 可排序字段（解耦供 service 使用）
export const RoleSortableKeys = [
  "id",
  "name",
  "isEnabled",
  "createTimeUtc",
] as const satisfies RequiredKeys<RolePOLike>[];

export const roleTable = sqliteTable("system_role", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull().unique(),
  description: text("description"),
  remark: text("remark"),
  permissions: text("permissions"), // JSON array string
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
    CREATE TABLE IF NOT EXISTS system_role (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      remark TEXT,
      permissions TEXT,
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
  console.log("💾 表 system_role 已初始化");
}

export default roleTable;
