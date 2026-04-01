import { baseTableInit } from "@/db/utils/schema";
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
const DepartmentBasePO = {
  name: {
    type: "string",
    description: "部门名称",
    examples: ["技术部"],
    maxLength: 100,
  },
  parentId: {
    type: ["number", "null"],
    nullable: true,
    description: "父部门ID，支持部门层级",
    minimum: 1,
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注说明",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof DepartmentPOLike, JSONSchema>>;
const DepartmentPO = {
  ...IndexPO,
  ...DepartmentBasePO,
  ...AuditPO,
} as const satisfies Record<keyof DepartmentPOLike, JSONSchema>;
export type DepartmentPOLike = InferSelectModel<typeof departmentTable>; // 列表
type DepartmentSelectPOLike = InferInsertModel<typeof departmentTable>;
type DepartmentAddPOLike = Omit<
  DepartmentPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type DepartmentUpdatePOLike = Partial<
  Omit<DepartmentSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<DepartmentPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO }; // 删改查
export const DepartmentBaseVO = DepartmentBasePO;
export const DepartmentVO = {
  ...IndexVO,
  ...DepartmentBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof DepartmentVOLike, JSONSchema>>; // 详情
export const DepartmentListVO = DepartmentVO; // 列表
export const DepartmentAddVO = {
  ...DepartmentBaseVO,
} as const satisfies Partial<Record<keyof DepartmentVOLike, JSONSchema>>; // 新增
export const DepartmentUpdateVO = {
  ...IndexVO,
  ...DepartmentBaseVO,
} as const satisfies Partial<Record<keyof DepartmentVOLike, JSONSchema>>; // 更新
export type DepartmentVOLike = DepartmentPOLike;
export type DepartmentAddVOLike = Omit<DepartmentAddPOLike, "creatorId">;
export type DepartmentUpdateVOLike = DepartmentUpdatePOLike;
export type DepartmentDeleteVOLike = Pick<DepartmentVOLike, IndexKeyLike>;
export type DepartmentGetVOLike = Pick<DepartmentVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const DepartmentAddKeys = [
  "name",
  "parentId",
  "isEnabled",
  "remark",
] as const satisfies RequiredKeys<DepartmentAddVOLike>[];
export const DepartmentUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<DepartmentUpdateVOLike>[];
export const DepartmentDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<DepartmentDeleteVOLike>[];
export const DepartmentGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<DepartmentGetVOLike>[];
const DepartmentBaseKeys = [
  ...IndexKey,
  ...DepartmentAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<DepartmentPOLike>[];
export const DepartmentListKeys = DepartmentBaseKeys;
export const DepartmentDetailKeys = DepartmentBaseKeys;

// 可排序字段（解耦供 service 使用）
export const DepartmentSortableKeys = [
  "id",
  "name",
  "createTimeUtc",
] as const satisfies RequiredKeys<DepartmentPOLike>[];

export const departmentTable = sqliteTable("system_department", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull().unique(),
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
  await baseTableInit("system_department");
}

export default departmentTable;
