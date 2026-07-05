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
const ApiDocsBasePO = {
  name: {
    type: "string",
    description: "文档名称",
    maxLength: 100,
  },
  version: {
    type: ["string", "null"],
    nullable: true,
    description: "文档版本",
    maxLength: 50,
  },
  description: {
    type: ["string", "null"],
    nullable: true,
    description: "文档描述",
    maxLength: 500,
  },
  docType: {
    type: "string",
    description: "文档类型",
    enum: ["swagger2.0", "openapi3.0", "openapi3.1"],
  },
  content: {
    type: "string",
    description: "文档内容 (JSON 字符串)",
  },
} as const satisfies Partial<Record<keyof ApiDocsPOLike, JSONSchema>>;

export const ApiDocsPO = {
  ...IndexPO,
  ...ApiDocsBasePO,
  ...AuditPO,
} as const satisfies Record<keyof ApiDocsPOLike, JSONSchema>;

export type ApiDocsPOLike = InferSelectModel<typeof apiDocsTable>;
type ApiDocsSelectPOLike = InferInsertModel<typeof apiDocsTable>;
type ApiDocsAddPOLike = Omit<ApiDocsPOLike, IndexKeyLike | AuditAddOmitKeyLike>;
type ApiDocsUpdatePOLike = Partial<
  Omit<ApiDocsSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<ApiDocsPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const ApiDocsBaseVO = ApiDocsBasePO;

export const ApiDocsVO = {
  ...IndexVO,
  ...ApiDocsBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof ApiDocsVOLike, JSONSchema>>;

export const ApiDocsListVO = ApiDocsVO;
export const ApiDocsAddVO = {
  name: ApiDocsBasePO.name,
  version: ApiDocsBasePO.version,
  description: ApiDocsBasePO.description,
  docType: ApiDocsBasePO.docType,
  content: ApiDocsBasePO.content,
} as const satisfies Partial<Record<keyof ApiDocsVOLike, JSONSchema>>;

export const ApiDocsUpdateVO = {
  ...IndexVO,
  ...ApiDocsAddVO,
} as const satisfies Partial<Record<keyof ApiDocsVOLike, JSONSchema>>;

export type ApiDocsVOLike = ApiDocsPOLike;
export type ApiDocsAddVOLike = Omit<ApiDocsAddPOLike, "creatorId">;
export type ApiDocsUpdateVOLike = ApiDocsUpdatePOLike;
export type ApiDocsDeleteVOLike = Pick<ApiDocsVOLike, IndexKeyLike>;
export type ApiDocsGetVOLike = Pick<ApiDocsVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const ApiDocsAddKeys = [
  "name",
  "docType",
  "content",
] as const satisfies RequiredKeys<ApiDocsAddVOLike>[];

export const ApiDocsUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ApiDocsUpdateVOLike>[];

export const ApiDocsDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ApiDocsDeleteVOLike>[];

export const ApiDocsGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ApiDocsGetVOLike>[];

const ApiDocsBaseKeys = [
  ...IndexKey,
  "name",
  "version",
  "description",
  "docType",
  "content",
  ...AuditKeys,
] as const satisfies RequiredKeys<ApiDocsPOLike>[];

export const ApiDocsListKeys = ApiDocsBaseKeys;
export const ApiDocsDetailKeys = ApiDocsBaseKeys;

export const ApiDocsSortableKeys = [
  "id",
  "name",
  "createTimeUtc",
] as const satisfies RequiredKeys<ApiDocsPOLike>[];

//----------------- Drizzle Tables ----------------//
export const apiDocsTable = sqliteTable("maintenance_api_docs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  version: text("version"),
  description: text("description"),
  docType: text("doc_type")
    .$type<"swagger2.0" | "openapi3.0" | "openapi3.1">()
    .notNull(),
  content: text("content").notNull(),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export default apiDocsTable;
