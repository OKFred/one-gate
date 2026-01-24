import db from "@/db/index";
import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
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
const LanguageUniquePO = {
  langCode: {
    type: "string",
    description: "语言代码",
    pattern: "^[a-z]{2}-[A-Z]{2}$",
    examples: ["zh-CN", "en-US"],
    maxLength: 10,
  },
} as const satisfies Partial<Record<keyof LanguagePOLike, JSONSchema>>;
const LanguageBasePO = {
  nativeName: {
    type: "string",
    description: "本地名称",
    examples: ["简体中文", "English"],
    maxLength: 50,
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
    examples: [true, false],
  },
  sortOrder: {
    type: "integer",
    description: "排序",
    examples: [1, 2, 3],
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof LanguagePOLike, JSONSchema>>;
const LanguagePO = {
  ...IndexPO,
  ...LanguageUniquePO,
  ...LanguageBasePO,
  ...AuditPO,
} as const satisfies Record<keyof LanguagePOLike, JSONSchema>;
export type LanguagePOLike = InferSelectModel<typeof languageTable>; // 列表
type LanguageSelectPOLike = InferInsertModel<typeof languageTable>;
type LanguageAddPOLike = Omit<
  LanguagePOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type LanguageUpdatePOLike = Partial<
  Omit<LanguageSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<LanguagePOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO }; // 删改查
const LanguageUniqueVO = LanguageUniquePO;
const LanguageBaseVO = LanguageBasePO;
export const LanguageVO = {
  ...IndexVO,
  ...LanguageUniqueVO,
  ...LanguageBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof LanguageVOLike, JSONSchema>>; // 详情
export const LanguageListVO = LanguageVO; // 列表
export const LanguageAddVO = {
  ...LanguageUniqueVO,
  ...LanguageBaseVO,
} as const satisfies Partial<Record<keyof LanguageVOLike, JSONSchema>>; // 新增
export const LanguageUpdateVO = {
  ...IndexVO,
  ...LanguageUniqueVO,
  ...LanguageBaseVO,
} as const satisfies Partial<Record<keyof LanguageVOLike, JSONSchema>>; // 更新

export type LanguageVOLike = LanguagePOLike;
export type LanguageAddVOLike = Omit<LanguageAddPOLike, "creatorId">;
export type LanguageUpdateVOLike = LanguageUpdatePOLike;
export type LanguageDeleteVOLike = Pick<LanguageVOLike, IndexKeyLike>;
export type LanguageGetVOLike = Pick<LanguageVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const LanguageAddKeys = [
  "langCode",
  "nativeName",
  "isEnabled",
  "sortOrder",
] as const satisfies RequiredKeys<LanguageAddVOLike>[];
export const LanguageUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<LanguageUpdateVOLike>[];
export const LanguageDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<LanguageDeleteVOLike>[];
export const LanguageGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<LanguageGetVOLike>[];
const LanguageBaseKeys = [
  ...IndexKey,
  ...LanguageAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<LanguagePOLike>[];

export const LanguageListKeys = LanguageBaseKeys;
export const LanguageDetailKeys = LanguageBaseKeys;
export const LanguageSortableKeys = [
  "id",
  "langCode",
  "sortOrder",
  "createTimeUtc",
] as const satisfies RequiredKeys<LanguagePOLike>[];

export const languageTable = sqliteTable(
  "i18n_language",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    langCode: text("lang_code", { length: 10 }).notNull(),
    nativeName: text("native_name", { length: 50 }).notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    remark: text("remark"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [uniqueIndex("idx_language_code").on(table.langCode)]
);

export async function tableInit() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS i18n_language (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lang_code TEXT NOT NULL,
      native_name TEXT NOT NULL,
      is_enabled INTEGER NOT NULL,
      sort_order INTEGER NOT NULL,
      remark TEXT,
      creator_id INTEGER NOT NULL,
      updater_id INTEGER,
      create_time_utc INTEGER DEFAULT (
        CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
        CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
      ),
      update_time_utc INTEGER
    )
  `);
  await db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_language_code ON i18n_language(lang_code)
  `);
  console.log("💾 表 i18n_language 已初始化");
}

export default languageTable;
