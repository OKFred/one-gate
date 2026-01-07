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
  tKey: {
    type: "string",
    description: "翻译键",
    pattern: "^[a-zA-Z0-9]+(?:\\.[a-zA-Z0-9]+)*$",
    examples: ["welcome.message"],
    maxLength: 100,
  },
} as const satisfies Partial<Record<keyof LanguagePOLike, JSONSchema>>;
const LanguageBasePO = {
  tValue: {
    type: "string",
    description: "翻译值",
    examples: ["Welcome to our application"],
    maxLength: 500,
  },
  valueHash: {
    type: "string",
    description: "值的SHA256哈希",
    examples: ["abc123..."],
    maxLength: 100,
  },
  langCode: {
    type: "string",
    description: "语言代码",
    examples: ["en-US", "zh-CN"],
    maxLength: 10,
  },
  namespace: {
    type: "string",
    description: "命名空间",
    examples: ["common"],
    maxLength: 100,
  },
  description: {
    type: ["string", "null"],
    nullable: true,
    description: "描述信息",
    examples: ["欢迎消息的翻译"],
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
  "namespace",
  "langCode",
  "tKey",
  "tValue",
  "valueHash",
  "description",
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

export const languageTable = sqliteTable(
  "i18n_language",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    namespace: text("namespace", { length: 100 }).notNull(),
    langCode: text("lang_code", { length: 10 }).notNull(),
    tKey: text("t_key").notNull(),
    tValue: text("t_value").notNull(),
    valueHash: text("value_hash", { length: 64 }).notNull(),
    description: text("description"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    index("idx_value_hash").on(table.valueHash),
    uniqueIndex("idx_unique_tkey_langcode").on(table.tKey, table.langCode),
  ]
);

export async function tableInit() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS i18n_language (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      namespace TEXT NOT NULL,
      lang_code TEXT NOT NULL,
      t_key TEXT NOT NULL,
      t_value TEXT NOT NULL,
      value_hash TEXT NOT NULL,
      description TEXT,
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
    CREATE INDEX IF NOT EXISTS idx_value_hash ON i18n_language(value_hash)
  `);
  await db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tkey_langcode ON i18n_language(t_key, lang_code)
  `);
  console.log("💾 表 i18n_language 已初始化");
}

export default languageTable;
