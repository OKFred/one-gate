import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
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
    maximum: 99999,
  },
} as const satisfies Partial<Record<keyof RegionPOLike, JSONSchema>>;
const RegionBasePO = {
  labels: {
    type: "object",
    description: "语言对象",
    properties: {
      "zh-CN": {
        type: "string",
        description: "中文（中国）",
        maxLength: 100,
      },
      "en-US": {
        type: "string",
        description: "英语（美国）",
        maxLength: 150,
      },
    },
    propertyNames: {
      type: "string",
      maxLength: 10,
      pattern: "^[a-z]{2}-[A-Z]{2}$",
    },
    additionalProperties: true,
  },
  iso3166Independent: {
    type: "boolean",
    description: "是否ISO3166独立主权国家",
  },
  businessLanguages: {
    type: ["array", "null"],
    nullable: true,
    description: "语言代码列表",
    items: {
      type: "string",
      maxLength: 10,
      examples: ["zh-CN", "en-US"],
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
  "businessLanguages",
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
  "businessLanguages",
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
    businessLanguages: text("business_languages", { mode: "json" }).$type<
      string[]
    >(),
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

export default regionTable;
