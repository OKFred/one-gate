import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/sqlite-core";
import { sql, type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { softDeleteColumns } from "@hodor/core/db/soft-delete";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import { DataScopeValues } from "@hodor/core/types/dataScope";
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
} from "@hodor/core/db/common/schema";
import { type RequiredKeys } from "@hodor/core/types/app";

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
  permissionCount: {
    type: "integer",
    description: "权限数量",
  },
  dataScope: {
    type: "string",
    enum: DataScopeValues,
    description: "数据访问范围",
    default: "self_only",
  },
  customDeptIds: {
    type: ["string", "null"],
    nullable: true,
    description: "自定义部门ID列表（JSON序列化，仅 dataScope=custom 时有效）",
  },
} as const satisfies Partial<Record<keyof RolePOLike, JSONSchema>>;
const RolePO = {
  ...IndexPO,
  ...RoleUniquePO,
  ...RoleBasePO,
  ...AuditPO,
} as const satisfies Record<keyof RolePOLike, JSONSchema>;
export type RoleRecord = InferSelectModel<typeof roleTable>;
export type RolePOLike = Omit<
  RoleRecord,
  "isDeleted" | "deletedTimeUtc" | "deleterId"
>;
type RoleSelectPOLike = Omit<
  InferInsertModel<typeof roleTable>,
  "isDeleted" | "deletedTimeUtc" | "deleterId"
>;
type RoleAddPOLike = Omit<
  RolePOLike,
  IndexKeyLike | AuditAddOmitKeyLike | "permissionCount"
>;
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
  remark: RoleBaseVO.remark,
  isEnabled: RoleBaseVO.isEnabled,
} as const satisfies Partial<Record<keyof RoleAddVOLike, JSONSchema>>; // 新增
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

export const RoleDeleteWithUndoReq = {
  type: "object",
  properties: {
    id: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
    expectedUpdateTimeUtc: {
      type: ["integer", "null"],
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
    },
  },
  required: ["id", "expectedUpdateTimeUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const RoleDeleteWithUndoRes = {
  type: "object",
  properties: {
    resourceType: { type: "string", const: "role" },
    id: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
    expectedDeletedTimeUtc: { type: "integer", minimum: 0 },
    undoExpiresTimeUtc: { type: "integer", minimum: 0 },
    serverTimeUtc: { type: "integer", minimum: 0 },
  },
  required: [
    "resourceType",
    "id",
    "expectedDeletedTimeUtc",
    "undoExpiresTimeUtc",
    "serverTimeUtc",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;

//----------------- Required Keys ----------------//
export const RoleAddKeys = [
  "name",
  "remark",
  "isEnabled",
  "dataScope",
  "customDeptIds",
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

export const roleTable = sqliteTable(
  "system_role",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    remark: text("remark"),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
    permissionCount: integer("permission_count").notNull(),
    dataScope: text("data_scope")
      .$type<import("@hodor/core/types/dataScope").DataScopeValue>()
      .notNull(),
    customDeptIds: text("custom_dept_ids"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
    ...softDeleteColumns(),
  },
  (table) => [
    uniqueIndex("system_role_name_active_unique")
      .on(table.name)
      .where(sql`${table.isDeleted} = 0`),
    index("system_role_deleted_time_idx").on(
      table.isDeleted,
      table.deletedTimeUtc
    ),
    check(
      "system_role_soft_delete_state_check",
      sql`(${table.isDeleted} = 0 AND ${table.deletedTimeUtc} IS NULL AND ${table.deleterId} IS NULL) OR (${table.isDeleted} = 1 AND ${table.deletedTimeUtc} IS NOT NULL AND ${table.deleterId} IS NOT NULL)`
    ),
  ]
);

export default roleTable;
