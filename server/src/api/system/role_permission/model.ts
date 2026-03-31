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
    const sqlPath = path.resolve(__dirname, "../../../db/sql/system_role_permission.sql");

    const sql = fs.readFileSync(sqlPath, "utf8");
    const sqlStatements = sql.split(";").filter((s) => s.trim());

    for (const statement of sqlStatements) {
      if (statement.trim()) {
        await db.run(statement);
      }
    }
    console.log("💾 表 system_role_permission 已初始化");
  } catch (err) {
    console.error("❌ 初始化表 system_role_permission 失败:", err);
  }
}

export default rolePermissionTable;
