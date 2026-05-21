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
const SchemaFormBasePO = {
  code: {
    type: "string",
    description: "表单唯一标识",
    examples: ["survey_01"],
    maxLength: 100,
  },
  name: {
    type: "string",
    description: "表单名称",
    examples: ["用户调查问卷"],
    maxLength: 100,
  },
  schemaData: {
    type: "string",
    description: "JSON Schema 字符串",
  },
  uiSchemaData: {
    type: ["string", "null"],
    nullable: true,
    description: "UI Schema 字符串",
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
} as const satisfies Partial<Record<keyof SchemaFormPOLike, JSONSchema>>;

const SchemaFormPO = {
  ...IndexPO,
  ...SchemaFormBasePO,
  ...AuditPO,
} as const satisfies Record<keyof SchemaFormPOLike, JSONSchema>;

export type SchemaFormPOLike = InferSelectModel<typeof schemaFormTable>; // 列表
type SchemaFormSelectPOLike = InferInsertModel<typeof schemaFormTable>;
type SchemaFormAddPOLike = Omit<
  SchemaFormPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type SchemaFormUpdatePOLike = Partial<
  Omit<SchemaFormSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<SchemaFormPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO }; // 删改查
export const SchemaFormBaseVO = SchemaFormBasePO;
export const SchemaFormVO = {
  ...IndexVO,
  ...SchemaFormBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof SchemaFormVOLike, JSONSchema>>; // 详情

export const SchemaFormListVO = SchemaFormVO; // 列表
export const SchemaFormAddVO = {
  ...SchemaFormBaseVO,
} as const satisfies Partial<Record<keyof SchemaFormVOLike, JSONSchema>>; // 新增
export const SchemaFormUpdateVO = {
  ...IndexVO,
  ...SchemaFormBaseVO,
} as const satisfies Partial<Record<keyof SchemaFormVOLike, JSONSchema>>; // 更新

export type SchemaFormVOLike = SchemaFormPOLike;
export type SchemaFormAddVOLike = Omit<SchemaFormAddPOLike, "creatorId">;
export type SchemaFormUpdateVOLike = SchemaFormUpdatePOLike;
export type SchemaFormDeleteVOLike = Pick<SchemaFormVOLike, IndexKeyLike>;
export type SchemaFormGetVOLike = Pick<SchemaFormVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const SchemaFormAddKeys = [
  "code",
  "name",
  "schemaData",
  "uiSchemaData",
  "remark",
  "isEnabled",
] as const satisfies RequiredKeys<SchemaFormAddVOLike>[];

export const SchemaFormUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<SchemaFormUpdateVOLike>[];

export const SchemaFormDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<SchemaFormDeleteVOLike>[];

export const SchemaFormGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<SchemaFormGetVOLike>[];

const SchemaFormBaseKeys = [
  ...IndexKey,
  ...SchemaFormAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<SchemaFormPOLike>[];

export const SchemaFormListKeys = SchemaFormBaseKeys;
export const SchemaFormDetailKeys = SchemaFormBaseKeys;

// 可排序字段
export const SchemaFormSortableKeys = [
  "id",
  "name",
  "code",
  "isEnabled",
  "createTimeUtc",
] as const satisfies RequiredKeys<SchemaFormPOLike>[];

export const schemaFormTable = sqliteTable("system_schema_form", {
  id: integer("id").primaryKey().notNull(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  schemaData: text("schema_data").notNull(),
  uiSchemaData: text("ui_schema_data"),
  remark: text("remark"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export default schemaFormTable;
