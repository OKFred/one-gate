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
const TranslationUniquePO = {
  tKey: {
    type: "string",
    description: "翻译键",
    pattern: "^[a-zA-Z0-9_]+(?:\\.[a-zA-Z0-9_]+)*$",
    examples: ["welcome.message", "businessType.i18n"],
    maxLength: 100,
  },
} as const satisfies Partial<Record<keyof TranslationPOLike, JSONSchema>>;
const TranslationBasePO = {
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
  application: {
    type: "string",
    description: "应用",
    examples: ["frontend", "backend", "common"],
    maxLength: 100,
  },
  business: {
    type: "string",
    description: "业务",
    examples: ["email", "order"],
    maxLength: 100,
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注说明",
    examples: ["欢迎消息的翻译"],
    maxLength: 500,
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
    examples: [true, false],
  },
} as const satisfies Partial<Record<keyof TranslationPOLike, JSONSchema>>;
const TranslationPO = {
  ...IndexPO,
  ...TranslationUniquePO,
  ...TranslationBasePO,
  ...AuditPO,
} as const satisfies Record<keyof TranslationPOLike, JSONSchema>;
export type TranslationPOLike = InferSelectModel<typeof translationTable>; // 列表
type TranslationSelectPOLike = InferInsertModel<typeof translationTable>;
type TranslationAddPOLike = Omit<
  TranslationPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type TranslationUpdatePOLike = Partial<
  Omit<TranslationSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<TranslationPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO }; // 删改查
const TranslationUniqueVO = TranslationUniquePO;
const TranslationBaseVO = TranslationBasePO;
export const TranslationVO = {
  ...IndexVO,
  ...TranslationUniqueVO,
  ...TranslationBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof TranslationVOLike, JSONSchema>>; // 详情
export const TranslationListVO = TranslationVO; // 列表
export const TranslationAddVO = {
  ...TranslationUniqueVO,
  ...TranslationBaseVO,
} as const satisfies Partial<Record<keyof TranslationVOLike, JSONSchema>>; // 新增
export const TranslationUpdateVO = {
  ...IndexVO,
  ...TranslationUniqueVO,
  ...TranslationBaseVO,
} as const satisfies Partial<Record<keyof TranslationVOLike, JSONSchema>>; // 更新

export type TranslationVOLike = TranslationPOLike;
export type TranslationAddVOLike = Omit<TranslationAddPOLike, "creatorId">;
export type TranslationUpdateVOLike = TranslationUpdatePOLike;
export type TranslationDeleteVOLike = Pick<TranslationVOLike, IndexKeyLike>;
export type TranslationGetVOLike = Pick<TranslationVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const TranslationAddKeys = [
  "application",
  "business",
  "langCode",
  "tKey",
  "tValue",
  "valueHash",
  "remark",
  "isEnabled",
] as const satisfies RequiredKeys<TranslationAddVOLike>[];
export const TranslationUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<TranslationUpdateVOLike>[];
export const TranslationDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<TranslationDeleteVOLike>[];
export const TranslationGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<TranslationGetVOLike>[];
const TranslationBaseKeys = [
  ...IndexKey,
  ...TranslationAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<TranslationPOLike>[];

export const TranslationListKeys = TranslationBaseKeys;
export const TranslationDetailKeys = TranslationBaseKeys;
export const TranslationSortableKeys = [
  "id",
  "application",
  "business",
  "langCode",
  "tKey",
  "createTimeUtc",
] as const satisfies RequiredKeys<TranslationPOLike>[];

export const translationTable = sqliteTable(
  "i18n_translation",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    application: text("application", { length: 100 }).notNull(),
    business: text("business", { length: 100 }).notNull(),
    langCode: text("lang_code", { length: 10 }).notNull(),
    tKey: text("t_key").notNull(),
    tValue: text("t_value").notNull(),
    valueHash: text("value_hash", { length: 64 }).notNull(),
    remark: text("remark"),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
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
    CREATE TABLE IF NOT EXISTS i18n_translation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application TEXT NOT NULL,
      business TEXT NOT NULL,
      lang_code TEXT NOT NULL,
      t_key TEXT NOT NULL,
      t_value TEXT NOT NULL,
      value_hash TEXT NOT NULL,
      remark TEXT,
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
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_value_hash ON i18n_translation(value_hash)
  `);
  await db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tkey_langcode ON i18n_translation(t_key, lang_code)
  `);
  console.log("💾 表 i18n_translation 已初始化");
}

export default translationTable;
