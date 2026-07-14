import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
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
const SchemaFormDataBasePO = {
  formCode: {
    type: "string",
    description: "关联的表单 Code",
    maxLength: 100,
  },
  businessId: {
    type: "number",
    description: "关联的业务记录 ID",
  },
  dataContent: {
    type: "string",
    description: "用户提交的 JSON 数据内容（序列化字符串）",
  },
} as const satisfies Partial<Record<keyof SchemaFormDataPOLike, JSONSchema>>;

const SchemaFormDataPO = {
  ...IndexPO,
  ...SchemaFormDataBasePO,
  ...AuditPO,
  creatorName: {
    type: ["string", "null"],
    nullable: true,
    description: "创建人姓名",
  },
  updaterName: {
    type: ["string", "null"],
    nullable: true,
    description: "修改人姓名",
  },
} as const satisfies Record<keyof SchemaFormDataPOLike, JSONSchema>;

export type SchemaFormDataPOLike = InferSelectModel<typeof schemaFormDataTable>;
type SchemaFormDataSelectPOLike = InferInsertModel<typeof schemaFormDataTable>;
type SchemaFormDataAddPOLike = Omit<
  SchemaFormDataPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type SchemaFormDataUpdatePOLike = Partial<
  Omit<SchemaFormDataSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<SchemaFormDataPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const SchemaFormDataBaseVO = SchemaFormDataBasePO;
export const SchemaFormDataVO = {
  ...IndexVO,
  ...SchemaFormDataBaseVO,
  ...AuditVO,
  creatorName: {
    type: ["string", "null"],
    nullable: true,
    description: "创建人姓名",
  },
  updaterName: {
    type: ["string", "null"],
    nullable: true,
    description: "修改人姓名",
  },
} as const satisfies Partial<Record<keyof SchemaFormDataVOLike, JSONSchema>>;

export const SchemaFormDataListVO = SchemaFormDataVO;

export type SchemaFormDataVOLike = SchemaFormDataPOLike;
export type SchemaFormDataAddVOLike = Omit<
  SchemaFormDataAddPOLike,
  "creatorId"
>;
export type SchemaFormDataUpdateVOLike = SchemaFormDataUpdatePOLike;
export type SchemaFormDataDeleteVOLike = Pick<
  SchemaFormDataVOLike,
  IndexKeyLike
>;
export const SchemaFormDataGetVO = {
  id: IndexVO.id,
  formCode: SchemaFormDataBaseVO.formCode,
  businessId: SchemaFormDataBaseVO.businessId,
} as const satisfies Record<keyof SchemaFormDataGetVOLike, JSONSchema>;

export type SchemaFormDataGetVOLike = Pick<
  SchemaFormDataVOLike,
  IndexKeyLike | "formCode" | "businessId"
>;

export const SchemaFormDataSubmitVO = {
  formCode: {
    ...SchemaFormDataBaseVO.formCode,
    minLength: 1,
  },
  businessId: SchemaFormDataBaseVO.businessId,
  data: {
    type: "object",
    description: "表单数据 (JSON 对象)",
    additionalProperties: true,
  },
} as const satisfies Record<string, JSONSchema>;

//----------------- Required Keys ----------------//
export const SchemaFormDataAddKeys = [
  "formCode",
  "businessId",
  "dataContent",
] as const satisfies RequiredKeys<SchemaFormDataAddVOLike>[];

export const SchemaFormDataDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<SchemaFormDataDeleteVOLike>[];

export const SchemaFormDataGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<SchemaFormDataGetVOLike>[];

const SchemaFormDataBaseKeys = [
  ...IndexKey,
  ...SchemaFormDataAddKeys,
  ...AuditKeys,
  "creatorName",
  "updaterName",
] as const satisfies RequiredKeys<SchemaFormDataPOLike>[];

export const SchemaFormDataListKeys = SchemaFormDataBaseKeys;
export const SchemaFormDataDetailKeys = SchemaFormDataBaseKeys;

// 可排序字段
export const SchemaFormDataSortableKeys = [
  "id",
  "formCode",
  "businessId",
  "createTimeUtc",
] as const satisfies RequiredKeys<SchemaFormDataPOLike>[];

export const schemaFormDataTable = sqliteTable("system_schema_form_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  formCode: text("form_code").notNull(),
  businessId: integer("business_id").notNull(),
  dataContent: text("data_content").notNull(),
  creatorId: integer("creator_id").notNull(),
  creatorName: text("creator_name"),
  updaterId: integer("updater_id"),
  updaterName: text("updater_name"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export default schemaFormDataTable;
