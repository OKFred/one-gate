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
const RolePermissionBasePO = {
  roleId: {
    type: "number",
    description: "角色ID",
    minimum: 1,
  },
  permissionId: {
    type: "number",
    description: "权限ID",
    minimum: 1,
  },
  resourceFilter: {
    type: ["string", "null"],
    nullable: true,
    description: "资源过滤器，JSON格式，用于实现资源级权限控制",
    examples: [
      '{"userId":"${currentUser.id}"}',
      '{"deptId":"${currentUser.deptId}"}',
    ],
    maxLength: 1000,
  },
  conditions: {
    type: ["string", "null"],
    nullable: true,
    description: "条件判断，JSON格式，用于动态权限控制",
    examples: [
      '{"ipRange":["192.168.1.0/24"],"timeRange":{"start":"09:00","end":"18:00"}}',
    ],
    maxLength: 2000,
  },
} as const satisfies Partial<Record<keyof RolePermissionPOLike, JSONSchema>>;

const RolePermissionPO = {
  ...IndexPO,
  ...RolePermissionBasePO,
  ...AuditPO,
} as const satisfies Record<keyof RolePermissionPOLike, JSONSchema>;

export type RolePermissionPOLike = InferSelectModel<typeof rolePermissionTable>;
type RolePermissionSelectPOLike = InferInsertModel<typeof rolePermissionTable>;
type RolePermissionAddPOLike = Omit<
  RolePermissionPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type RolePermissionUpdatePOLike = Partial<
  Omit<RolePermissionSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<RolePermissionPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const RolePermissionBaseVO = RolePermissionBasePO;
export const RolePermissionVO = {
  ...IndexVO,
  ...RolePermissionBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof RolePermissionVOLike, JSONSchema>>;
export const RolePermissionListVO = RolePermissionVO;
export const RolePermissionAddVO = {
  ...RolePermissionBaseVO,
} as const satisfies Partial<Record<keyof RolePermissionVOLike, JSONSchema>>;
export const RolePermissionUpdateVO = {
  ...IndexVO,
  ...RolePermissionBaseVO,
} as const satisfies Partial<Record<keyof RolePermissionVOLike, JSONSchema>>;

export type RolePermissionVOLike = RolePermissionPOLike;
export type RolePermissionAddVOLike = Omit<
  RolePermissionAddPOLike,
  "creatorId"
>;
export type RolePermissionUpdateVOLike = RolePermissionUpdatePOLike;
export type RolePermissionDeleteVOLike = Pick<
  RolePermissionVOLike,
  IndexKeyLike
>;
export type RolePermissionGetVOLike = Pick<RolePermissionVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const RolePermissionAddKeys = [
  "roleId",
  "permissionId",
  "resourceFilter",
  "conditions",
] as const satisfies RequiredKeys<RolePermissionAddVOLike>[];
export const RolePermissionUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<RolePermissionUpdateVOLike>[];
export const RolePermissionDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<RolePermissionDeleteVOLike>[];
export const RolePermissionGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<RolePermissionGetVOLike>[];
const RolePermissionBaseKeys = [
  ...IndexKey,
  ...RolePermissionAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<RolePermissionPOLike>[];
export const RolePermissionListKeys = RolePermissionBaseKeys;
export const RolePermissionDetailKeys = RolePermissionBaseKeys;

// 可排序字段
export const RolePermissionSortableKeys = [
  "id",
  "roleId",
  "permissionId",
  "createTimeUtc",
] as const satisfies RequiredKeys<RolePermissionPOLike>[];

export const rolePermissionTable = sqliteTable("system_role_permission", {
  id: integer("id").primaryKey().notNull(),
  roleId: integer("role_id").notNull(),
  permissionId: integer("permission_id").notNull(),
  resourceFilter: text("resource_filter"),
  conditions: text("conditions"),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export async function tableInit() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS system_role_permission (
      id INTEGER PRIMARY KEY,
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      resource_filter TEXT,
      conditions TEXT,
      creator_id INTEGER NOT NULL,
      updater_id INTEGER,
      create_time_utc INTEGER DEFAULT (
        CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
        CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
      ),
      update_time_utc INTEGER,
      UNIQUE(role_id, permission_id)
    )
  `);
  // 创建索引以优化查询
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_role_permission_role_id 
    ON system_role_permission(role_id)
  `);
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_role_permission_permission_id 
    ON system_role_permission(permission_id)
  `);
  console.log("💾 表 system_role_permission 已初始化");
}

export default rolePermissionTable;
