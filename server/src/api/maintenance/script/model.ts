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
const JsScriptBasePO = {
  scriptKey: {
    type: "string",
    description: "脚本唯一标识键",
    maxLength: 100,
  },
  name: {
    type: "string",
    description: "脚本名称",
    maxLength: 100,
  },
  description: {
    type: ["string", "null"],
    nullable: true,
    description: "脚本描述",
    maxLength: 500,
  },
  code: {
    type: "string",
    description: "ES Module 脚本代码",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
} as const satisfies Partial<Record<keyof JsScriptPOLike, JSONSchema>>;

export const JsScriptPO = {
  ...IndexPO,
  ...JsScriptBasePO,
  ...AuditPO,
} as const satisfies Record<keyof JsScriptPOLike, JSONSchema>;

export type JsScriptPOLike = InferSelectModel<typeof jsScriptTable>;
type JsScriptSelectPOLike = InferInsertModel<typeof jsScriptTable>;
type JsScriptAddPOLike = Omit<
  JsScriptPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type JsScriptUpdatePOLike = Partial<
  Omit<JsScriptSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<JsScriptPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const JsScriptBaseVO = JsScriptBasePO;

export const JsScriptVO = {
  ...IndexVO,
  ...JsScriptBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof JsScriptVOLike, JSONSchema>>;

export const JsScriptListVO = JsScriptVO;
export const JsScriptAddVO = {
  scriptKey: JsScriptBasePO.scriptKey,
  name: JsScriptBasePO.name,
  description: JsScriptBasePO.description,
  code: JsScriptBasePO.code,
  isEnabled: JsScriptBasePO.isEnabled,
} as const satisfies Partial<Record<keyof JsScriptVOLike, JSONSchema>>;

export const JsScriptUpdateVO = {
  ...IndexVO,
  ...JsScriptAddVO,
} as const satisfies Partial<Record<keyof JsScriptVOLike, JSONSchema>>;

export type JsScriptVOLike = JsScriptPOLike;
export type JsScriptAddVOLike = Omit<JsScriptAddPOLike, "creatorId">;
export type JsScriptUpdateVOLike = JsScriptUpdatePOLike;
export type JsScriptDeleteVOLike = Pick<JsScriptVOLike, IndexKeyLike>;
export type JsScriptGetVOLike = Pick<JsScriptVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const JsScriptAddKeys = [
  "scriptKey",
  "name",
  "code",
  "isEnabled",
] as const satisfies RequiredKeys<JsScriptAddVOLike>[];

export const JsScriptUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<JsScriptUpdateVOLike>[];

export const JsScriptDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<JsScriptDeleteVOLike>[];

export const JsScriptGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<JsScriptGetVOLike>[];

const JsScriptBaseKeys = [
  ...IndexKey,
  "scriptKey",
  "name",
  "description",
  "code",
  "isEnabled",
  ...AuditKeys,
] as const satisfies RequiredKeys<JsScriptPOLike>[];

export const JsScriptListKeys = JsScriptBaseKeys;
export const JsScriptDetailKeys = JsScriptBaseKeys;

export const JsScriptSortableKeys = [
  "id",
  "name",
  "scriptKey",
  "createTimeUtc",
] as const satisfies RequiredKeys<JsScriptPOLike>[];

//----------------- Drizzle Tables ----------------//

export const jsScriptTable = sqliteTable("maintenance_js_script", {
  id: integer("id").primaryKey().notNull(),
  scriptKey: text("script_key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  code: text("code").notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export default jsScriptTable;
