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
const DepartmentBasePO = {
  name: {
    type: "string",
    description: "部门名称",
    examples: ["技术部"],
    maxLength: 100,
  },
  description: {
    type: ["string", "null"],
    nullable: true,
    description: "部门描述",
    examples: ["负责技术研发工作"],
    maxLength: 500,
  },
  parentId: {
    type: ["number", "null"],
    nullable: true,
    description: "父部门ID，支持部门层级",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
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
const DepartmentBaseVO = DepartmentBasePO;
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
  "description",
  "parentId",
  "isEnabled",
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

export const departmentTable = sqliteTable("system_department", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull().unique(),
  description: text("description"),
  parentId: integer("parent_id"),
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
    CREATE TABLE IF NOT EXISTS system_department (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      parent_id INTEGER,
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
  console.log("💾 表 system_department 已初始化");
}

export default departmentTable;
