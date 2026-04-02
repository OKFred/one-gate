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
  "business",
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
  "isEnabled",
  "createTimeUtc",
] as const satisfies RequiredKeys<PermissionPOLike>[];

export const permissionTable = sqliteTable("system_permission", {
  id: integer("id").primaryKey().notNull(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(), // menu, button, api
  resource: text("resource"),
  business: text("business"),
  remark: text("remark"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export default permissionTable;
