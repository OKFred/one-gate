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
const RegionUniquePO = {
  alpha2Code: {
    type: "string",
    description: "ISO 3166-1 alpha-2",
    pattern: "^[A-Z]{2}$",
    maxLength: 2,
  },
  alpha3Code: {
    type: "string",
    description: "ISO 3166-1 alpha-3",
    pattern: "^[A-Z]{3}$",
    maxLength: 3,
  },
  numeric: {
    type: "integer",
    description: "ISO 3166-1 numeric",
    examples: [156],
  },
} as const satisfies Partial<Record<keyof RegionPOLike, JSONSchema>>;
const RegionBasePO = {
  labels: {
    type: "object",
    description: "语言对象",
    properties: {
      zh_CN: {
        type: "string",
        description: "中文简体",
        maxLength: 100,
      },
      en_US: {
        type: "string",
        description: "英文美国",
        maxLength: 150,
      },
    },
    additionalProperties: false,
  },
  iso3166Independent: {
    type: "boolean",
    description: "是否ISO3166上标为独立主权国家",
  },
  languages: {
    type: ["array", "null"],
    nullable: true,
    description: "语言代码列表",
    items: {
      type: "string",
      maxLength: 10,
      examples: ["zh_CN", "en_US"],
    },
    uniqueItems: true,
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
    examples: [true, false],
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof RegionPOLike, JSONSchema>>;
const RegionPO = {
  ...IndexPO,
  ...RegionUniquePO,
  ...RegionBasePO,
  ...AuditPO,
} as const satisfies Record<keyof RegionPOLike, JSONSchema>;
export type RegionPOLike = InferSelectModel<typeof regionTable>; // 列表
type RegionSelectPOLike = InferInsertModel<typeof regionTable>;
type RegionAddPOLike = Omit<RegionPOLike, IndexKeyLike | AuditAddOmitKeyLike>;
type RegionUpdatePOLike = Partial<
  Omit<RegionSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<RegionPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO }; // 删改查
const RegionUniqueVO = RegionUniquePO;
const RegionBaseVO = RegionBasePO;
export const RegionVO = {
  ...IndexVO,
  ...RegionUniqueVO,
  ...RegionBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof RegionVOLike, JSONSchema>>; // 详情
export const RegionListVO = RegionVO; // 列表
export const RegionAddVO = {
  ...RegionUniqueVO,
  ...RegionBaseVO,
} as const satisfies Partial<Record<keyof RegionVOLike, JSONSchema>>; // 新增
export const RegionUpdateVO = {
  ...IndexVO,
  ...RegionUniqueVO,
  ...RegionBaseVO,
} as const satisfies Partial<Record<keyof RegionVOLike, JSONSchema>>; // 更新

export type RegionVOLike = RegionPOLike;
export type RegionAddVOLike = Omit<RegionAddPOLike, "creatorId">;
export type RegionUpdateVOLike = RegionUpdatePOLike;
export type RegionDeleteVOLike = Pick<RegionVOLike, IndexKeyLike>;
export type RegionGetVOLike = Pick<RegionVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const RegionAddKeys = [
  "labels",
  "alpha2Code",
  "alpha3Code",
  "numeric",
  "iso3166Independent",
  "languages",
  "isEnabled",
  "remark",
] as const satisfies RequiredKeys<RegionAddVOLike>[];
export const RegionUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<RegionUpdateVOLike>[];
export const RegionDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<RegionDeleteVOLike>[];
export const RegionGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<RegionGetVOLike>[];
const RegionBaseKeys = [
  ...IndexKey,
  ...RegionAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<RegionPOLike>[];

export const RegionListKeys = RegionBaseKeys;
export const RegionDetailKeys = RegionBaseKeys;
export const RegionSortableKeys = [
  "id",
  "labels",
  "alpha2Code",
  "alpha3Code",
  "numeric",
  "iso3166Independent",
  "isEnabled",
  "languages",
  "createTimeUtc",
] as const satisfies RequiredKeys<RegionPOLike>[];

export const regionTable = sqliteTable(
  "i18n_region",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    labels: text("labels", { mode: "json" }).$type<{ [key: string]: string }>(),
    alpha2Code: text("alpha2_code", { length: 2 }).notNull(),
    alpha3Code: text("alpha3_code", { length: 3 }).notNull(),
    numeric: integer("numeric").notNull(),
    iso3166Independent: integer("iso_3166_independent", {
      mode: "boolean",
    }).notNull(),
    languages: text("languages", { mode: "json" }).$type<string[]>(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
    remark: text("remark", { length: 500 }),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    uniqueIndex("idx_region_numeric").on(table.numeric),
    uniqueIndex("idx_region_alpha2").on(table.alpha2Code),
    uniqueIndex("idx_region_alpha3").on(table.alpha3Code),
  ]
);

export async function tableInit() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS i18n_region (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      labels TEXT NOT NULL,
      alpha2_code TEXT NOT NULL,
      alpha3_code TEXT NOT NULL,
      numeric INTEGER NOT NULL,
      iso_3166_independent INTEGER NOT NULL,
      languages TEXT,
      is_enabled INTEGER NOT NULL,
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
    CREATE UNIQUE INDEX IF NOT EXISTS idx_region_alpha2 ON i18n_region(alpha2_code)
  `);
  await db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_region_alpha3 ON i18n_region(alpha3_code)
  `);
  await db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_region_numeric ON i18n_region(numeric)
  `);
  console.log("💾 表 i18n_region 已初始化");
}

export default regionTable;
